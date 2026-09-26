import { NextRequest } from "next/server";
import sharp from "sharp";
import { ok, fail, clientIp } from "@/lib/api";
import { getSessionUser, canAccess } from "@/lib/auth";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { storeWebpPhoto } from "@/lib/media";
import { audit } from "@/lib/notify";

export const runtime = "nodejs";

/** POST /api/media — authenticated multipart upload (product | banner). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in to upload photos", 401, "UNAUTHENTICATED");

  // Reject cross-site form posts, even with a valid session cookie.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const host = new URL(origin).host;
      const validHosts = [req.headers.get("host"), req.headers.get("x-forwarded-host"), req.nextUrl.host];
      if (!validHosts.includes(host)) return fail("Cross-origin upload blocked", 403, "BAD_ORIGIN");
    } catch {
      return fail("Invalid origin", 403, "BAD_ORIGIN");
    }
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 9 * 1024 * 1024) return fail("Image too large (max 8 MB)", 413, "FILE_TOO_LARGE");
  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Invalid upload", 400, "BAD_UPLOAD"); }
  const purpose = form.get("purpose");
  const image = form.get("image");
  if (purpose !== "product" && purpose !== "banner") return fail("Choose product or banner image", 422, "BAD_PURPOSE");
  if (!(image instanceof File)) return fail("Select an image to upload", 422, "NO_FILE");
  if (purpose === "banner") {
    if (!canAccess(user, "sections")) return fail("Only CMS admins can upload banners", 403, "FORBIDDEN");
  } else if (!canAccess(user, "products")) {
    if (user.role !== "vendor") return fail("Only vendors and product admins can upload products", 403, "FORBIDDEN");
    const v = await db.select({ status: vendors.status }).from(vendors).where(eq(vendors.userId, user.id)).limit(1);
    if (v[0]?.status !== "approved") return fail("Your seller account is not approved", 403, "VENDOR_PENDING");
  }

  const maxBytes = purpose === "banner" ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
  if (image.size === 0 || image.size > maxBytes) return fail(`Image must be smaller than ${purpose === "banner" ? "8" : "5"} MB`, 413, "FILE_TOO_LARGE");
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return fail("Please upload a JPG, PNG or WebP image", 415, "UNSUPPORTED_TYPE");
  }
  const buffer = Buffer.from(await image.arrayBuffer());
  const jpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp) return fail("File content is not a valid image", 415, "INVALID_FILE");

  try {
    const input = sharp(buffer, { limitInputPixels: 35000000, failOn: "error" });
    const info = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(info.format || "")) return fail("Unsupported image format", 415, "UNSUPPORTED_TYPE");
    if (purpose === "banner" && ((info.width || 0) < 700 || (info.height || 0) < 280)) {
      return fail("Banner photo must be at least 700 × 280 pixels", 422, "IMAGE_TOO_SMALL");
    }
    if (purpose === "product" && ((info.width || 0) < 160 || (info.height || 0) < 160)) {
      return fail("Product photo must be at least 160 × 160 pixels", 422, "IMAGE_TOO_SMALL");
    }
    // Strip EXIF / metadata, auto-rotate, and deliver fast WebP images.
    const optimized = await sharp(buffer, { limitInputPixels: 35000000 })
      .rotate()
      .resize({ width: purpose === "banner" ? 2200 : 1400, height: purpose === "banner" ? 1400 : 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: purpose === "banner" ? 84 : 82, effort: 4 })
      .toBuffer();
    const url = await storeWebpPhoto(optimized, purpose, user.id);
    await audit(user.id, user.name, `media.upload.${purpose}`, "media", url, { bytes: optimized.length }, clientIp(req));
    return ok({ url, width: info.width, height: info.height, bytes: optimized.length }, 201);
  } catch (error) {
    console.error("[media] upload failed", error);
    return fail("Image processing failed. Please try a different photo.", 422, "IMAGE_FAILED");
  }
}
