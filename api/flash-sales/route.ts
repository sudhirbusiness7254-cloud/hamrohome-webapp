import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { ok, fail, parseBody, requireRole, clientIp } from "@/lib/api";
import { audit } from "@/lib/notify";

// GET /api/flash-sales — active sales with products | ?id= — one sale | ?all=1 (admin: everything)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = q.get("id");
  const now = new Date();

  async function withProducts(sale: typeof s.flashSales.$inferSelect) {
    const fps = await db
      .select({
        id: s.products.id, name: s.products.name, slug: s.products.slug,
        price: s.products.price, salePrice: s.products.salePrice,
        ratingAvg: s.products.ratingAvg, reviewCount: s.products.reviewCount, soldCount: s.products.soldCount,
        discountPercent: s.flashSaleProducts.discountPercent, stockLimit: s.flashSaleProducts.stockLimit,
        sold: s.flashSaleProducts.soldCount, rowId: s.flashSaleProducts.id,
        brand: { name: s.brands.name },
      })
      .from(s.flashSaleProducts)
      .innerJoin(s.products, eq(s.flashSaleProducts.productId, s.products.id))
      .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
      .where(and(eq(s.flashSaleProducts.flashSaleId, sale.id), eq(s.products.status, "approved")));
    const items = await Promise.all(fps.map(async (p) => {
      const v = await db.select({ imageColor: s.productVariants.imageColor }).from(s.productVariants).where(eq(s.productVariants.productId, p.id)).limit(1);
      const base = p.salePrice ?? p.price;
      return { ...p, imageColor: v[0]?.imageColor || "#94a3b8", flashPrice: Math.round((base * (100 - p.discountPercent)) / 100) };
    }));
    return { ...sale, products: items };
  }

  if (id) {
    const rows = await db.select().from(s.flashSales).where(eq(s.flashSales.id, id)).limit(1);
    if (!rows[0]) return fail("Flash sale not found", 404, "NOT_FOUND");
    return ok({ sale: await withProducts(rows[0]) });
  }

  if (q.get("all") === "1") {
    const auth = await requireRole("admin");
    if ("response" in auth) return auth.response;
    const rows = await db.select().from(s.flashSales).orderBy(desc(s.flashSales.createdAt));
    const counts = await Promise.all(rows.map(async (r) => {
      const ps = await db.select({ id: s.flashSaleProducts.id }).from(s.flashSaleProducts).where(eq(s.flashSaleProducts.flashSaleId, r.id));
      return { ...r, productCount: ps.length };
    }));
    return ok({ sales: counts });
  }

  const rows = await db.select().from(s.flashSales)
    .where(and(eq(s.flashSales.isActive, true), lte(s.flashSales.startsAt, now), gte(s.flashSales.endsAt, now)))
    .orderBy(desc(s.flashSales.endsAt));
  const sales = await Promise.all(rows.map(withProducts));
  return ok({ sales: sales.filter((x) => x.products.length > 0) });
}

const itemSchema = z.object({ productId: z.string().uuid(), discountPercent: z.number().int().min(1).max(90), stockLimit: z.number().int().min(1).max(100000) });

// POST /api/flash-sales {name,...} (admin create) | {op:'add-product', id, ...item}
export async function POST(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (b.value.op === "add-product") {
    const p = itemSchema.extend({ id: z.string().uuid() }).safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const prod = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, p.data.productId)).limit(1);
    if (!prod[0]) return fail("Product not found", 404, "NOT_FOUND");
    try {
      const [row] = await db.insert(s.flashSaleProducts).values({ flashSaleId: p.data.id, productId: p.data.productId, discountPercent: p.data.discountPercent, stockLimit: p.data.stockLimit }).returning();
      return ok({ item: row }, 201);
    } catch {
      return fail("Product already in this sale", 409, "DUPLICATE");
    }
  }

  const schema = z.object({
    name: z.string().min(3).max(120),
    description: z.string().max(500).nullable().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    products: z.array(itemSchema).optional(),
  });
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  if (new Date(p.data.endsAt) <= new Date(p.data.startsAt)) return fail("End must be after start", 400, "BAD_DATES");
  const [sale] = await db.insert(s.flashSales).values({
    name: p.data.name, description: p.data.description || null,
    startsAt: new Date(p.data.startsAt), endsAt: new Date(p.data.endsAt),
  }).returning();
  for (const it of p.data.products ?? []) {
    await db.insert(s.flashSaleProducts).values({ flashSaleId: sale.id, productId: it.productId, discountPercent: it.discountPercent, stockLimit: it.stockLimit });
  }
  await audit(auth.user.id, auth.user.name, "flashsale.create", "flash_sale", sale.id, { name: sale.name }, clientIp(req));
  return ok({ sale }, 201);
}

// PATCH /api/flash-sales {id, ...} | DELETE /api/flash-sales?id=[&product=pid]
export async function PATCH(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const id = b.value.id as string;
  if (!id) return fail("Sale required", 400, "BAD_REQUEST");
  const schema = z.object({
    name: z.string().min(3).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  });
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  const patch: Partial<typeof s.flashSales.$inferInsert> = {};
  if (p.data.name !== undefined) patch.name = p.data.name;
  if (p.data.description !== undefined) patch.description = p.data.description;
  if (p.data.startsAt) patch.startsAt = new Date(p.data.startsAt);
  if (p.data.endsAt) patch.endsAt = new Date(p.data.endsAt);
  if (p.data.isActive !== undefined) patch.isActive = p.data.isActive;
  const [u] = await db.update(s.flashSales).set(patch).where(eq(s.flashSales.id, id)).returning();
  if (!u) return fail("Flash sale not found", 404, "NOT_FOUND");
  await audit(auth.user.id, auth.user.name, "flashsale.update", "flash_sale", id, patch, clientIp(req));
  return ok({ sale: u });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("response" in auth) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  const product = req.nextUrl.searchParams.get("product");
  if (!id) return fail("Sale required", 400, "BAD_REQUEST");
  if (product) {
    await db.delete(s.flashSaleProducts).where(and(eq(s.flashSaleProducts.flashSaleId, id), eq(s.flashSaleProducts.productId, product)));
    return ok({ done: true });
  }
  await db.delete(s.flashSales).where(eq(s.flashSales.id, id));
  await audit(auth.user.id, auth.user.name, "flashsale.delete", "flash_sale", id, {}, clientIp(req));
  return ok({ done: true });
}
