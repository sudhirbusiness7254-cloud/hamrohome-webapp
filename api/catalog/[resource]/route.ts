import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { ok, fail } from "@/lib/api";
import { productCover } from "@/lib/media";

// GET /api/catalog/categories[?slug=] | brands[?slug=] | zones | stores?slug= | suggest?q=
export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  const q = req.nextUrl.searchParams;

  if (resource === "categories") {
    const slug = q.get("slug");
    if (slug) {
      const c = await db.select().from(s.categories).where(eq(s.categories.slug, slug)).limit(1);
      if (!c[0] || !c[0].isActive) return fail("Category not found", 404, "NOT_FOUND");
      const children = await db.select().from(s.categories).where(eq(s.categories.parentId, c[0].id));
      const cnt = await db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(and(eq(s.products.categoryId, c[0].id), eq(s.products.status, "approved")));
      return ok({ category: { ...c[0], productCount: cnt[0]?.n ?? 0 }, children });
    }
    const all = await db.select().from(s.categories).where(eq(s.categories.isActive, true)).orderBy(s.categories.sortOrder);
    const counts = await db.select({ categoryId: s.products.categoryId, n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.status, "approved")).groupBy(s.products.categoryId);
    const map = new Map(counts.map((c) => [c.categoryId, c.n]));
    return ok({ categories: all.map((c) => ({ ...c, productCount: map.get(c.id) ?? 0 })) });
  }

  if (resource === "brands") {
    const slug = q.get("slug");
    if (slug) {
      const b = await db.select().from(s.brands).where(eq(s.brands.slug, slug)).limit(1);
      if (!b[0]) return fail("Brand not found", 404, "NOT_FOUND");
      const cnt = await db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(and(eq(s.products.brandId, b[0].id), eq(s.products.status, "approved")));
      return ok({ brand: { ...b[0], productCount: cnt[0]?.n ?? 0 } });
    }
    const all = await db.select().from(s.brands).orderBy(s.brands.name);
    const counts = await db.select({ brandId: s.products.brandId, n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.status, "approved")).groupBy(s.products.brandId);
    const map = new Map(counts.map((c) => [c.brandId, c.n]));
    return ok({ brands: all.map((b) => ({ ...b, productCount: map.get(b.id) ?? 0 })) });
  }

  if (resource === "zones") {
    const zones = await db.select().from(s.deliveryZones).where(eq(s.deliveryZones.isActive, true)).orderBy(s.deliveryZones.sortOrder);
    return ok({ zones });
  }

  if (resource === "stores") {
    const slug = q.get("slug");
    if (!slug) return fail("Store slug required", 400, "BAD_REQUEST");
    const v = await db.select().from(s.vendors).where(eq(s.vendors.slug, slug)).limit(1);
    if (!v[0] || v[0].status !== "approved") return fail("Store not found", 404, "NOT_FOUND");
    const prods = await db
      .select({
        id: s.products.id, name: s.products.name, slug: s.products.slug, price: s.products.price,
        salePrice: s.products.salePrice, ratingAvg: s.products.ratingAvg, reviewCount: s.products.reviewCount,
        soldCount: s.products.soldCount, imageUrl: productCover, brand: { name: s.brands.name },
      })
      .from(s.products)
      .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
      .where(and(eq(s.products.vendorId, v[0].userId), eq(s.products.status, "approved")))
      .orderBy(desc(s.products.soldCount))
      .limit(48);
    const withColors = await Promise.all(prods.map(async (p) => {
      const vv = await db.select({ imageColor: s.productVariants.imageColor }).from(s.productVariants).where(eq(s.productVariants.productId, p.id)).limit(1);
      return { ...p, imageColor: vv[0]?.imageColor || "#94a3b8" };
    }));
    const stats = await db.select({
      products: sql<number>`count(*)::int`,
      sold: sql<number>`COALESCE(SUM(${s.products.soldCount}),0)::int`,
      rating: sql<string>`COALESCE(AVG(${s.products.ratingAvg}),0)::numeric`,
    }).from(s.products).where(and(eq(s.products.vendorId, v[0].userId), eq(s.products.status, "approved")));
    return ok({ vendor: v[0], products: withColors, stats: stats[0] });
  }

  if (resource === "suggest") {
    const term = (q.get("q") || "").trim();
    if (term.length < 2) return ok({ products: [], categories: [], brands: [] });
    const like = `%${term}%`;
    const products = await db.select({ name: s.products.name, slug: s.products.slug, price: s.products.price, salePrice: s.products.salePrice, imageUrl: productCover })
      .from(s.products)
      .where(and(eq(s.products.status, "approved"), or(ilike(s.products.name, like), ilike(s.products.sku, like), ilike(sql`array_to_string(${s.products.tags}, ' ')`, like))))
      .limit(6);
    const categories = await db.select({ name: s.categories.name, slug: s.categories.slug }).from(s.categories).where(ilike(s.categories.name, like)).limit(4);
    const brands = await db.select({ name: s.brands.name, slug: s.brands.slug }).from(s.brands).where(ilike(s.brands.name, like)).limit(4);
    return ok({ products, categories, brands });
  }

  return fail("Not found", 404, "NOT_FOUND");
}
