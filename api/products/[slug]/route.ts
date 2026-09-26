import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { ok, fail } from "@/lib/api";
import { getActiveFlashMap } from "@/lib/pricing";
import { getSessionUser } from "@/lib/auth";
import { productCover } from "@/lib/media";

// GET /api/products/[slug] — full detail + variants + reviews + related
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const rows = await db
    .select({
      product: s.products,
      brand: { name: s.brands.name, slug: s.brands.slug },
      category: { name: s.categories.name, slug: s.categories.slug },
      vendor: { shopName: s.vendors.shopName, slug: s.vendors.slug, logoColor: s.vendors.logoColor, description: s.vendors.description },
    })
    .from(s.products)
    .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId))
    .where(eq(s.products.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row || row.product.status !== "approved") return fail("Product not found", 404, "NOT_FOUND");
  const p = row.product;

  await db.update(s.products).set({ viewCount: sql`${s.products.viewCount} + 1` }).where(eq(s.products.id, p.id));

  const [variants, images, videos, reviews, breakdown] = await Promise.all([
    db.select().from(s.productVariants).where(and(eq(s.productVariants.productId, p.id), eq(s.productVariants.isActive, true))),
    db.select().from(s.productImages).where(eq(s.productImages.productId, p.id)).orderBy(s.productImages.sortOrder),
    db.select().from(s.productVideos).where(eq(s.productVideos.productId, p.id)),
    db.select({
      id: s.reviews.id, rating: s.reviews.rating, title: s.reviews.title, comment: s.reviews.comment,
      images: s.reviews.images, verifiedPurchase: s.reviews.verifiedPurchase, vendorReply: s.reviews.vendorReply,
      helpfulCount: s.reviews.helpfulCount, createdAt: s.reviews.createdAt, userName: s.users.name,
    })
      .from(s.reviews)
      .innerJoin(s.users, eq(s.reviews.userId, s.users.id))
      .where(and(eq(s.reviews.productId, p.id), eq(s.reviews.adminHidden, false)))
      .orderBy(desc(s.reviews.createdAt))
      .limit(10),
    db.select({ rating: s.reviews.rating, n: sql<number>`count(*)::int` }).from(s.reviews).where(eq(s.reviews.productId, p.id)).groupBy(s.reviews.rating),
  ]);

  const related = await db
    .select({
      id: s.products.id, name: s.products.name, slug: s.products.slug,
      price: s.products.price, salePrice: s.products.salePrice,
      ratingAvg: s.products.ratingAvg, reviewCount: s.products.reviewCount, soldCount: s.products.soldCount,
      imageUrl: productCover,
      brand: { name: s.brands.name },
    })
    .from(s.products)
    .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
    .where(p.categoryId ? and(eq(s.products.status, "approved"), eq(s.products.categoryId, p.categoryId), ne(s.products.id, p.id)) : and(eq(s.products.status, "approved"), ne(s.products.id, p.id)))
    .orderBy(desc(s.products.soldCount))
    .limit(8);
  const relatedColors = await Promise.all(related.map(async (r) => {
    const v = await db.select({ imageColor: s.productVariants.imageColor }).from(s.productVariants).where(eq(s.productVariants.productId, r.id)).limit(1);
    return { ...r, imageColor: v[0]?.imageColor || "#94a3b8" };
  }));

  const flash = await getActiveFlashMap();
  const f = flash.get(p.id);

  // can current user review?
  const session = await getSessionUser();
  let canReview = false;
  let myReview: { id: string; rating: number; title: string | null; comment: string | null } | null = null;
  if (session) {
    const mine = await db.select().from(s.reviews).where(and(eq(s.reviews.productId, p.id), eq(s.reviews.userId, session.id))).limit(1);
    if (mine[0]) myReview = { id: mine[0].id, rating: mine[0].rating, title: mine[0].title, comment: mine[0].comment };
    const bought = await db
      .select({ id: s.orders.id })
      .from(s.orders)
      .innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
      .where(and(eq(s.orders.userId, session.id), eq(s.orders.status, "delivered"), eq(s.orderItems.productId, p.id)))
      .limit(1);
    canReview = bought.length > 0;
  }

  return ok({
    product: { ...p, ratingAvg: String(p.ratingAvg) },
    brand: row.brand, category: row.category, vendor: row.vendor,
    variants: variants.map((v) => ({ ...v, available: v.stock - v.reservedStock })),
    images, videos,
    reviews: { items: reviews, breakdown: breakdown.map((b) => ({ rating: b.rating, count: b.n })) },
    related: relatedColors,
    flash: f && f.remaining > 0 ? { discount: f.discount, remaining: f.remaining } : null,
    canReview, myReview,
  });
}
