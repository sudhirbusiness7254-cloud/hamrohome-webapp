import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, asc, sql, ilike, or, gte, lte, inArray } from "drizzle-orm";
import { ok, fail } from "@/lib/api";
import { getActiveFlashMap } from "@/lib/pricing";
import { productCover } from "@/lib/media";

// GET /api/products?q=&category=&brand=&vendor=&min=&max=&rating=&sort=&featured=&page=&limit=
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const term = (q.get("q") || "").trim();
  const categorySlug = q.get("category");
  const brandSlug = q.get("brand");
  const vendorSlug = q.get("vendor");
  const min = q.get("min") ? Number(q.get("min")) : null;
  const max = q.get("max") ? Number(q.get("max")) : null;
  const rating = q.get("rating") ? Number(q.get("rating")) : null;
  const sort = q.get("sort") || "newest";
  const featured = q.get("featured") === "true";
  const page = Math.max(1, Number(q.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(q.get("limit") || 12)));
  const offset = (page - 1) * limit;

  const conds: ReturnType<typeof eq>[] = [eq(s.products.status, "approved")];

  if (categorySlug) {
    const c = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, categorySlug)).limit(1);
    if (!c[0]) return fail("Category not found", 404, "NOT_FOUND");
    const kids = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.parentId, c[0].id));
    conds.push(inArray(s.products.categoryId, [c[0].id, ...kids.map((k) => k.id)]));
  }
  if (brandSlug) {
    const b = await db.select({ id: s.brands.id }).from(s.brands).where(eq(s.brands.slug, brandSlug)).limit(1);
    if (!b[0]) return fail("Brand not found", 404, "NOT_FOUND");
    conds.push(eq(s.products.brandId, b[0].id));
  }
  if (vendorSlug) {
    const v = await db.select({ userId: s.vendors.userId }).from(s.vendors).where(eq(s.vendors.slug, vendorSlug)).limit(1);
    if (!v[0]) return fail("Store not found", 404, "NOT_FOUND");
    conds.push(eq(s.products.vendorId, v[0].userId));
  }
  if (term) {
    const like = `%${term}%`;
    conds.push(
      or(
        ilike(s.products.name, like),
        ilike(s.products.description, like),
        ilike(s.products.sku, like),
        ilike(sql`array_to_string(${s.products.tags}, ' ')`, like),
      )!,
    );
  }
  if (min !== null && !Number.isNaN(min)) conds.push(gte(sql`COALESCE(${s.products.salePrice}, ${s.products.price})`, min));
  if (max !== null && !Number.isNaN(max)) conds.push(lte(sql`COALESCE(${s.products.salePrice}, ${s.products.price})`, max));
  if (rating) conds.push(gte(s.products.ratingAvg, String(rating)));
  if (featured) conds.push(eq(s.products.isFeatured, true));

  const where = and(...conds);
  const orderBy =
    sort === "price_asc" ? asc(sql`COALESCE(${s.products.salePrice}, ${s.products.price})`)
    : sort === "price_desc" ? desc(sql`COALESCE(${s.products.salePrice}, ${s.products.price})`)
    : sort === "rating" ? desc(s.products.ratingAvg)
    : sort === "bestselling" ? desc(s.products.soldCount)
    : sort === "discount" ? desc(sql`CASE WHEN ${s.products.salePrice} IS NULL THEN 0 ELSE (${s.products.price} - ${s.products.salePrice})::float / ${s.products.price} END`)
    : desc(s.products.createdAt);

  const [totalRows, items] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(where),
    db.select({
      id: s.products.id, name: s.products.name, slug: s.products.slug,
      price: s.products.price, salePrice: s.products.salePrice,
      ratingAvg: s.products.ratingAvg, reviewCount: s.products.reviewCount,
      soldCount: s.products.soldCount, stock: s.products.stock, reservedStock: s.products.reservedStock,
      imageUrl: productCover,
      brand: { name: s.brands.name },
      category: { name: s.categories.name, slug: s.categories.slug },
      vendor: { shopName: s.vendors.shopName, slug: s.vendors.slug },
    })
      .from(s.products)
      .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
      .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
      .leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
  ]);

  const flash = await getActiveFlashMap();
  const pids = items.map((i) => i.id);
  const colorRows = pids.length > 0
    ? await db.select({ productId: s.productVariants.productId, imageColor: s.productVariants.imageColor }).from(s.productVariants).where(inArray(s.productVariants.productId, pids))
    : [];
  const colorMap = new Map<string, string>();
  for (const c of colorRows) if (!colorMap.has(c.productId) && c.imageColor) colorMap.set(c.productId, c.imageColor);

  const total = totalRows[0]?.n ?? 0;
  return ok({
    items: items.map((p) => {
      const f = flash.get(p.id);
      const base = p.salePrice ?? p.price;
      const flashPrice = f && f.remaining > 0 ? Math.round((base * (100 - f.discount)) / 100) : null;
      return { ...p, imageColor: colorMap.get(p.id) ?? "#94a3b8", available: p.stock - p.reservedStock, flashPrice, flashDiscount: flashPrice ? f!.discount : null };
    }),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  });
}
