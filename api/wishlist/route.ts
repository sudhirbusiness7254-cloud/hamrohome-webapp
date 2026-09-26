import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ok, fail, parseBody, requireUser } from "@/lib/api";
import { productCover } from "@/lib/media";

// GET /api/wishlist — ids + full items
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const rows = await db
    .select({
      productId: s.wishlists.productId,
      id: s.products.id, name: s.products.name, slug: s.products.slug,
      price: s.products.price, salePrice: s.products.salePrice,
      ratingAvg: s.products.ratingAvg, reviewCount: s.products.reviewCount, soldCount: s.products.soldCount,
      imageUrl: productCover,
      brand: { name: s.brands.name },
    })
    .from(s.wishlists)
    .innerJoin(s.products, eq(s.wishlists.productId, s.products.id))
    .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
    .where(eq(s.wishlists.userId, auth.user.id))
    .orderBy(desc(s.wishlists.createdAt));
  const items = await Promise.all(rows.map(async (r) => {
    const v = await db.select({ imageColor: s.productVariants.imageColor }).from(s.productVariants).where(eq(s.productVariants.productId, r.id)).limit(1);
    return { ...r, imageColor: v[0]?.imageColor || "#94a3b8" };
  }));
  return ok({ ids: rows.map((r) => r.productId), items });
}

// POST /api/wishlist {productId} — toggle
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<{ productId?: string }>(req);
  if ("error" in b) return b.error;
  if (!b.value.productId) return fail("Product required", 400, "BAD_REQUEST");
  const p = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, b.value.productId)).limit(1);
  if (!p[0]) return fail("Product not found", 404, "NOT_FOUND");
  const ex = await db.select().from(s.wishlists).where(and(eq(s.wishlists.userId, auth.user.id), eq(s.wishlists.productId, b.value.productId))).limit(1);
  if (ex[0]) {
    await db.delete(s.wishlists).where(eq(s.wishlists.id, ex[0].id));
    return ok({ active: false });
  }
  await db.insert(s.wishlists).values({ userId: auth.user.id, productId: b.value.productId });
  return ok({ active: true });
}

// DELETE /api/wishlist?id=productId — remove
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("Product required", 400, "BAD_REQUEST");
  await db.delete(s.wishlists).where(and(eq(s.wishlists.userId, auth.user.id), eq(s.wishlists.productId, id)));
  return ok({ active: false });
}
