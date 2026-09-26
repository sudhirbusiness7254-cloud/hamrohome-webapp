/**
 * Idempotent image backfill for sample products and hero campaigns.
 * Photos sourced from Pexels free-to-use stock photography; custom hero art
 * is generated specifically for Bazzaro. Re-running never overwrites a
 * merchant's uploaded images or an admin's edited campaign.
 *
 * Run: npx tsx --env-file=.env src/db/seed-media.ts
 */
import { db } from "./index";
import { banners, orderItems, productImages, products } from "./schema";
import { eq, sql } from "drizzle-orm";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Pexels photo IDs; every sample SKU has its own relevant photograph.
const productPhotoIds: Record<string, number> = {
  "novaphone-x1-5g-256gb": 11120516,
  "everestpad-pro-14-laptop": 18311089,
  "sajilo-buds-tws-earbuds": 4526407,
  "nova-watch-5-smartwatch": 31541678,
  "65w-gan-wall-charger": 4765366,
  "cruzer-4k-action-camera": 16045136,
  "novaphone-x2-5g-512gb": 7989741,
  "daura-surwal-set-classic": 14768019,
  "kathmandu-hoodie": 10284607,
  "urbanfeet-trek-pro-shoes": 27256460,
  "annapurna-fleece-jacket": 19850784,
  "gandaki-sella-rice-10kg": 31555431,
  "illamici-gold-tea-500g": 29387144,
  "timur-sichuan-pepper-200g": 7829483,
  "himalayan-wild-honey-1kg": 5634205,
  "mountain-view-noodles-pack-of-12": 14853728,
  "handforged-copper-karai-24cm": 29684979,
  "handwoven-dhaka-rug": 38317548,
  "bamboo-steamer-set-3-tier": 24029950,
  "yak-wool-facial-cream": 4841482,
  "chamomile-soap-bar-set": 19522722,
  "everest-cricket-bat-kashmir-willow": 20652481,
  "himalaya-yoga-mat-pro": 8436582,
  "summit-cycling-helmet": 7752839,
  "test-wireless-mouse": 12877898,
};

const galleryExtras: Record<string, number> = {
  "novaphone-x1-5g-256gb": 18311092,
  "everestpad-pro-14-laptop": 12880803,
  "sajilo-buds-tws-earbuds": 3756985,
  "kathmandu-hoodie": 19882433,
  "himalayan-wild-honey-1kg": 9105966,
};

async function download(id: number, file: string, width = 680, height = 680) {
  try {
    const existing = await stat(file);
    if (existing.size > 5000) return true;
  } catch { /* missing */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const source = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${width}&h=${height}`;
    const res = await fetch(source, { signal: controller.signal });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("image")) {
      throw new Error(`Photo ${id}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) throw new Error(`Photo ${id} unexpectedly small`);
    await writeFile(file, buf);
    return true;
  } catch (error) {
    console.error(`[media] ${id}:`, error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function seedMedia() {
  const dir = path.join(process.cwd(), "public", "images", "products");
  await mkdir(dir, { recursive: true });
  const entries = Object.entries(productPhotoIds);
  const extraEntries = Object.entries(galleryExtras);
  const failures: string[] = [];

  // Controlled concurrency avoids overwhelming the stock CDN.
  const jobs = [
    ...entries.map(([slug, id]) => ({ slug, id, extra: false })),
    ...extraEntries.map(([slug, id]) => ({ slug, id, extra: true })),
  ];
  for (let i = 0; i < jobs.length; i += 5) {
    await Promise.all(jobs.slice(i, i + 5).map(async (job) => {
      const name = job.extra ? `${job.slug}-detail.jpg` : `${job.slug}.jpg`;
      const ok = await download(job.id, path.join(dir, name));
      if (!ok) failures.push(name);
    }));
  }

  const localHero = path.join(process.cwd(), "public", "images", "hero-local.jpg");
  const heroOk = await download(37585002, localHero, 1720, 950);
  if (!heroOk) failures.push("hero-local.jpg");

  let added = 0;
  const all = await db.select({ id: products.id, slug: products.slug, name: products.name }).from(products);
  for (const p of all) {
    if (!productPhotoIds[p.slug]) continue;
    const url = `/images/products/${p.slug}.jpg`;
    if (failures.includes(`${p.slug}.jpg`)) continue;
    const existing = await db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(productImages.sortOrder);
    if (existing.length === 0) {
      await db.insert(productImages).values({ productId: p.id, url, alt: `${p.name} product photo`, sortOrder: 0 });
      added++;
    }
    if (galleryExtras[p.slug] && !failures.includes(`${p.slug}-detail.jpg`)) {
      const extra = `/images/products/${p.slug}-detail.jpg`;
      if (!existing.some((x) => x.url === extra)) {
        await db.insert(productImages).values({ productId: p.id, url: extra, alt: `${p.name} detail view`, sortOrder: 1 });
        added++;
      }
    }
  }

  // Preserve photo snapshots on historical orders and make old demo orders
  // display thumbnails even if the product listing changes later.
  await db.execute(sql`
    UPDATE order_items oi SET image_url = (
      SELECT pi.url FROM product_images pi
      WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order, pi.id LIMIT 1
    ) WHERE oi.image_url IS NULL AND oi.product_id IS NOT NULL
  `);

  const placeholderHero = await db.select().from(banners).where(eq(banners.image, "/images/banner-dashain.jpg"));
  if (placeholderHero[0]) {
    await db.update(banners).set({
      title: "A little more of what you love.",
      subtitle: "Discover local finds, everyday essentials and a whole lot more. All in one place.",
      image: "/images/hero-marketplace.jpg",
      linkHref: "/products",
      position: "hero",
      sortOrder: 1,
    }).where(eq(banners.id, placeholderHero[0].id));
  }
  const festival = await db.select({ id: banners.id }).from(banners).where(eq(banners.title, "The festival of good finds"));
  if (!festival[0]) {
    await db.insert(banners).values({
      title: "The festival of good finds",
      subtitle: "Discover standout style, thoughtful gifts and deals worth celebrating.",
      image: "/images/hero-festival.jpg",
      linkHref: "/products?sort=discount",
      position: "hero",
      sortOrder: 2,
      color: "#ea580c",
    });
  }
  const local = await db.select({ id: banners.id }).from(banners).where(eq(banners.title, "From Nepal, with love"));
  if (!local[0] && heroOk) {
    await db.insert(banners).values({
      title: "From Nepal, with love",
      subtitle: "Meet independent sellers and the stories behind your next favourite find.",
      image: "/images/hero-local.jpg",
      linkHref: "/products",
      position: "hero",
      sortOrder: 3,
      color: "#f59e0b",
    });
  }
  await db.update(banners).set({ image: "/images/hero-marketplace.jpg" }).where(eq(banners.image, "/images/banner-delivery.jpg"));
  if (heroOk) await db.update(banners).set({ image: "/images/hero-local.jpg" }).where(eq(banners.image, "/images/banner-grocery.jpg"));

  console.log(`[media] ${added} product images added; ${jobs.length + 1 - failures.length} photo files present.`);
  if (failures.length) console.warn("[media] Missing downloads:", failures.join(", "));
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("seed-media")) {
  seedMedia().catch((e) => { console.error(e); process.exitCode = 1; });
}
