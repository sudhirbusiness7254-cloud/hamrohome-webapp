import "server-only";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { mediaUploads, productImages, products } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

// Single cover-photo expression shared by homepage, listing, wishlist, cart,
// flash sales and seller pages. A correlated subquery avoids an N+1 query.
export const productCover = sql<string | null>`(
  SELECT photo.url FROM product_images photo
  WHERE photo.product_id = ${products.id}
  ORDER BY photo.sort_order ASC, photo.id ASC LIMIT 1
)`;

export const LOCAL_MEDIA_DIR = path.join(process.cwd(), ".data", "uploads");
const seedProductPattern = /^\/images\/products\/[a-z0-9-]+\.jpg$/;
const seedBannerPattern = /^\/images\/hero-(marketplace|festival|local)\.jpg$/;
const uploadedPattern = /^\/api\/media\/[a-f0-9-]{36}\.webp$/i;
const cdnPattern = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[a-zA-Z0-9/_.,~-]+\.webp(?:\?.*)?$/;

/** Never accept arbitrary URLs: only seeded assets or authenticated uploads. */
export async function validateProductPhotos(urls: string[], actorId: string, isAdmin: boolean, productId?: string): Promise<boolean> {
  if (urls.length < 1 || urls.length > 8 || new Set(urls).size !== urls.length) return false;
  if (urls.some((u) => typeof u !== "string" || u.length > 600)) return false;
  const uploaded = urls.filter((u) => !seedProductPattern.test(u));
  if (uploaded.some((u) => !uploadedPattern.test(u) && !cdnPattern.test(u))) return false;
  if (uploaded.length === 0) return true;
  const rows = await db.select().from(mediaUploads).where(inArray(mediaUploads.url, uploaded));
  let existing: string[] = [];
  if (productId) {
    existing = (await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, productId))).map((x) => x.url);
  }
  return uploaded.every((u) => {
    const media = rows.find((row) => row.url === u);
    return media?.purpose === "product" && (isAdmin || media.ownerId === actorId || existing.includes(u));
  });
}

export async function validateBannerPhoto(url: string, actorId: string): Promise<boolean> {
  if (seedBannerPattern.test(url)) return true;
  if (!uploadedPattern.test(url) && !cdnPattern.test(url)) return false;
  const rows = await db.select().from(mediaUploads).where(eq(mediaUploads.url, url)).limit(1);
  return rows[0]?.purpose === "banner" && rows[0].ownerId === actorId;
}

/** Local fallback for preview; Cloudinary for production when configured. */
export async function storeWebpPhoto(buffer: Buffer, purpose: "product" | "banner", actorId: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  let url: string;

  if (cloud && key && secret) {
    const body = new FormData();
    body.set("file", new Blob([new Uint8Array(buffer)], { type: "image/webp" }), `${randomUUID()}.webp`);
    body.set("folder", `bazzaro/${purpose}s`);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/`)) {
      throw new Error("Cloudinary returned an invalid photo URL");
    }
    url = data.secure_url;
  } else {
    await mkdir(LOCAL_MEDIA_DIR, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    await writeFile(path.join(LOCAL_MEDIA_DIR, filename), buffer, { flag: "wx" });
    url = `/api/media/${filename}`;
  }
  await db.insert(mediaUploads).values({ ownerId: actorId, purpose, url, mimeType: "image/webp", bytes: buffer.length });
  return url;
}

/** Product status can be approved only if a gallery exists. */
export async function hasProductPhoto(productId: string): Promise<boolean> {
  const rows = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).limit(1);
  return rows.length > 0;
}
