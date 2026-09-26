import Link from "next/link";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc, sql, and, gte, lte, or, isNull } from "drizzle-orm";
import { productCover } from "@/lib/media";
import { HeroCarousel, type HeroSlide } from "@/components/marketplace/HeroCarousel";
import { FlashSale } from "@/components/marketplace/FlashSale";
import { CategoryBar } from "@/components/marketplace/CategoryBar";
import { ProductRow } from "@/components/marketplace/ProductRow";
import { SellerSection } from "@/components/marketplace/SellerSection";
import { RecentlyViewed } from "@/components/marketplace/RecentlyViewed";
import { ScrollReveal } from "@/components/marketplace/ScrollReveal";
import { Footer } from "@/components/marketplace/Footer";
import { Header } from "@/components/marketplace/Header";

export const dynamic = "force-dynamic";

type ProductForColor = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  ratingAvg: string;
  reviewCount: number;
  soldCount: number;
  brand: { name: string } | null;
  imageUrl: string | null;
};

async function withColors(products: ProductForColor[]) {
  return Promise.all(
    products.map(async (p) => {
      const v = await db
        .select({ imageColor: s.productVariants.imageColor })
        .from(s.productVariants)
        .where(eq(s.productVariants.productId, p.id))
        .limit(1);
      return { ...p, imageColor: v[0]?.imageColor || "#94a3b8" };
    }),
  );
}

export default async function HomePage() {
  const approved = eq(s.products.status, "approved");

  // ── CMS: sections + banners ─────────────────────────────────────────────
  const sectionRows = await db.select().from(s.homepageSections).orderBy(s.homepageSections.sortOrder);
  const sec = (key: string, dTitle: string, dSub: string) => {
    const found = sectionRows.find((r) => r.key === key);
    if (!found) return { enabled: true, title: dTitle, subtitle: dSub };
    return { enabled: found.enabled, title: found.title || dTitle, subtitle: found.subtitle || dSub };
  };

  const now = new Date();
  const bannerRows = await db
    .select()
    .from(s.banners)
    .where(and(
      eq(s.banners.isActive, true),
      or(isNull(s.banners.startsAt), lte(s.banners.startsAt, now)),
      or(isNull(s.banners.endsAt), gte(s.banners.endsAt, now)),
    ))
    .orderBy(s.banners.sortOrder, s.banners.createdAt)
    .limit(24);
  const heroSlides: HeroSlide[] = bannerRows.filter((b) => b.position === "hero" && !!b.image).slice(0, 6).map((b, i) => ({
    id: b.id,
    badge: i === 0 ? "The Bazzaro edit" : "Made for your moments",
    title: b.title,
    subtitle: b.subtitle || "Shop from verified sellers across Nepal.",
    image: b.image,
    accent: ["from-amber-400 to-orange-500", "from-orange-500 to-red-500", "from-emerald-400 to-teal-500"][i % 3],
    cta: { label: "Explore collection", href: b.linkHref || "/products" },
    ctaSecondary: { label: "Browse all", href: "/products" },
  }));
  const promoRows = bannerRows.filter((b) => b.position === "promo" && !!b.image).slice(0, 2);

  // ── Products ────────────────────────────────────────────────────────────
  const base = {
    id: s.products.id,
    name: s.products.name,
    slug: s.products.slug,
    price: s.products.price,
    salePrice: s.products.salePrice,
    ratingAvg: s.products.ratingAvg,
    reviewCount: s.products.reviewCount,
    soldCount: s.products.soldCount,
    imageUrl: productCover,
    brand: { name: s.brands.name },
  };

  const [topSelling, newArrivalsRaw, featuredRaw, discountedRaw, topRatedRaw] = await Promise.all([
    db.select(base).from(s.products).leftJoin(s.brands, eq(s.products.brandId, s.brands.id)).where(approved).orderBy(desc(s.products.soldCount)).limit(8),
    db.select(base).from(s.products).leftJoin(s.brands, eq(s.products.brandId, s.brands.id)).where(approved).orderBy(desc(s.products.createdAt)).limit(8),
    db.select(base).from(s.products).leftJoin(s.brands, eq(s.products.brandId, s.brands.id)).where(and(approved, eq(s.products.isFeatured, true))).orderBy(desc(s.products.createdAt)).limit(8),
    db.select(base).from(s.products).leftJoin(s.brands, eq(s.products.brandId, s.brands.id)).where(and(approved, sql`${s.products.salePrice} IS NOT NULL`)).orderBy(desc(s.products.salePrice)).limit(8),
    db.select(base).from(s.products).leftJoin(s.brands, eq(s.products.brandId, s.brands.id)).where(approved).orderBy(desc(s.products.ratingAvg)).limit(8),
  ]);

  const [trending, newArrivals, featured, discounted, recommended] = await Promise.all([
    withColors(topSelling),
    withColors(newArrivalsRaw),
    withColors(featuredRaw),
    withColors(discountedRaw),
    withColors(topRatedRaw),
  ]);

  // ── Flash sale ──────────────────────────────────────────────────────────
  const activeFlashSale = await db
    .select()
    .from(s.flashSales)
    .where(and(eq(s.flashSales.isActive, true), gte(s.flashSales.endsAt, now)))
    .orderBy(desc(s.flashSales.createdAt))
    .limit(1);

  let flashProducts: {
    id: string; name: string; slug: string; price: number; salePrice: number | null;
    imageColor: string; imageUrl: string | null; discountPercent: number; flashPrice: number; stock: number; sold: number;
  }[] = [];
  let flashEndsAt = now.toISOString();
  let flashName = "Flash Sale";

  if (activeFlashSale[0]) {
    flashEndsAt = activeFlashSale[0].endsAt.toISOString();
    flashName = activeFlashSale[0].name;
    const fps = await db
      .select({
        id: s.products.id, name: s.products.name, slug: s.products.slug,
        price: s.products.price, salePrice: s.products.salePrice,
        imageUrl: productCover,
        discountPercent: s.flashSaleProducts.discountPercent,
        stock: s.flashSaleProducts.stockLimit, sold: s.flashSaleProducts.soldCount,
      })
      .from(s.flashSaleProducts)
      .innerJoin(s.products, eq(s.flashSaleProducts.productId, s.products.id))
      .where(eq(s.flashSaleProducts.flashSaleId, activeFlashSale[0].id))
      .limit(12);
    flashProducts = await Promise.all(
      fps.map(async (fp) => {
        const variant = await db
          .select({ imageColor: s.productVariants.imageColor })
          .from(s.productVariants)
          .where(eq(s.productVariants.productId, fp.id))
          .limit(1);
        const b = fp.salePrice ?? fp.price;
        return { ...fp, imageColor: variant[0]?.imageColor || "#94a3b8", flashPrice: Math.round((b * (100 - fp.discountPercent)) / 100) };
      }),
    );
  }

  // ── Vendors + brands ────────────────────────────────────────────────────
  const vendors = await db
    .select({
      userId: s.vendors.userId, shopName: s.vendors.shopName, slug: s.vendors.slug,
      logoColor: s.vendors.logoColor, description: s.vendors.description,
    })
    .from(s.vendors)
    .where(eq(s.vendors.status, "approved"))
    .limit(4);

  const vendorsWithCount = await Promise.all(
    vendors.map(async (v) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(s.products)
        .where(and(eq(s.products.vendorId, v.userId), approved));
      return { ...v, productCount: count };
    }),
  );

  const brandRows = await db.select().from(s.brands).limit(8);

  const hero = sec("hero", "Shop Nepal, Delivered Fast", "");
  const flash = sec("flash_sale", "Flash Sale", "Limited-time deals");
  const categories = sec("categories", "Popular Categories", "");
  const trendingSec = sec("trending", "Trending Now", "What Nepal is buying this week");
  const bestSec = sec("best_sellers", "Best Sellers", "Top-rated products loved by thousands");
  const newSec = sec("new_arrivals", "New Arrivals", "Fresh products just added");
  const recSec = sec("recommended", "Recommended For You", "Handpicked just for you");
  const brandsSec = sec("brands", "Popular Brands", "");
  const sellersSec = sec("local_sellers", "Local Nepal Sellers", "Shop direct from verified vendors");
  const newsletter = sec("newsletter", "Never Miss a Deal", "");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main>
        {hero.enabled && heroSlides.length > 0 && <HeroCarousel slides={heroSlides} />}
        {promoRows.length > 0 && <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-6 grid gap-3 sm:grid-cols-2">
          {promoRows.map((promo) => <Link href={promo.linkHref || "/products"} key={promo.id} className="relative group h-36 sm:h-44 rounded-2xl overflow-hidden border border-slate-700/70 bg-slate-800">
            <img src={promo.image!} alt={promo.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-transparent" />
            <div className="relative h-full flex flex-col justify-center px-6 max-w-xs">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Curated for you</span>
              <h2 className="text-xl font-black text-white leading-tight mt-1">{promo.title}</h2>
              <span className="text-xs text-slate-300 mt-1 line-clamp-1">{promo.subtitle}</span>
              <span className="text-xs text-amber-400 font-bold mt-2">Shop now →</span>
            </div>
          </Link>)}
        </div>}
        {categories.enabled && <CategoryBar />}
        {flash.enabled && flashProducts.length > 0 && (
          <FlashSale products={flashProducts} endsAt={flashEndsAt} />
        )}

        {trendingSec.enabled && (
          <div className="shimmer rounded-2xl mx-4 lg:mx-auto max-w-7xl">
            <ProductRow title={trendingSec.title} subtitle={`${trendingSec.subtitle} — ${flashName}`} viewAllHref="/products?sort=bestselling" products={trending} />
          </div>
        )}
        {bestSec.enabled && (
          <ProductRow title={bestSec.title} subtitle={bestSec.subtitle} viewAllHref="/products?sort=bestselling" products={trending} />
        )}
        {newSec.enabled && (
          <div className="shimmer rounded-2xl mx-4 lg:mx-auto max-w-7xl">
            <ProductRow title={newSec.title} subtitle={newSec.subtitle} viewAllHref="/products?sort=newest" products={newArrivals} />
          </div>
        )}
        {featured.length > 0 && (
          <ProductRow title="Featured" subtitle="Hand-picked by our editors" viewAllHref="/products?featured=true" products={featured} />
        )}
        {discounted.length > 0 && (
          <div className="shimmer rounded-2xl mx-4 lg:mx-auto max-w-7xl">
            <ProductRow title="Today's Deals" subtitle="Products on sale right now" viewAllHref="/products?sort=discount" products={discounted} />
          </div>
        )}
        {recSec.enabled && recommended.length > 0 && (
          <ProductRow title={recSec.title} subtitle={recSec.subtitle} viewAllHref="/products?sort=rating" products={recommended} />
        )}

        {brandsSec.enabled && brandRows.length > 0 && (
          <ScrollReveal stagger className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-white">{brandsSec.title}</h2>
              {brandsSec.subtitle && <p className="text-sm text-slate-400 mt-1">{brandsSec.subtitle}</p>}
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {brandRows.map((b) => (
                <Link key={b.id} href={`/brand/${b.slug}`}
                  className="cat-pill group flex flex-col items-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-4 hover:bg-slate-700/60 transition-all">
                  <span className="h-11 w-11 rounded-xl flex items-center justify-center text-base font-black text-white group-hover:scale-110 transition-transform" style={{ backgroundColor: b.color }}>
                    {b.name.charAt(0)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white text-center">{b.name}</span>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        )}

        {sellersSec.enabled && vendorsWithCount.length > 0 && <SellerSection sellers={vendorsWithCount} />}
        <RecentlyViewed />
      </main>
      <Footer showNewsletter={newsletter.enabled} />
    </div>
  );
}
