import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_MEDIA_DIR } from "@/lib/media";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

// Locally stored preview images. Production with Cloudinary serves from CDN.
export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(filename)) {
    return fail("Photo not found", 404, "NOT_FOUND");
  }
  try {
    const buffer = await readFile(path.join(LOCAL_MEDIA_DIR, filename));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("Photo not found", 404, "NOT_FOUND");
  }
}
