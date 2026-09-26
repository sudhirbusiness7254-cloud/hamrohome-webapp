import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ok, fail, parseBody, requireUser } from "@/lib/api";
import { notify } from "@/lib/notify";

async function refreshAggregates(productId: string) {
  const agg = await db.select({ n: sql<number>`count(*)::int`, avg: sql<string>`COALESCE(AVG(rating),0)::numeric` })
    .from(s.reviews)
    .where(and(eq(s.reviews.productId, productId), eq(s.reviews.adminHidden, false)));
  await db.update(s.products).set({ reviewCount: agg[0]?.n ?? 0, ratingAvg: String(agg[0]?.avg ?? 0) }).where(eq(s.products.id, productId));
}

// GET /api/reviews?product=slug[&page=] | ?view=mine
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("view") === "mine") {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;
    const rows = await db.select({ review: s.reviews, productName: s.products.name, productSlug: s.products.slug })
      .from(s.reviews)
      .innerJoin(s.products, eq(s.reviews.productId, s.products.id))
      .where(eq(s.reviews.userId, auth.user.id))
      .orderBy(desc(s.reviews.createdAt));
    return ok({ reviews: rows });
  }
  const slug = q.get("product");
  if (!slug) return fail("Product required", 400, "BAD_REQUEST");
  const p = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug)).limit(1);
  if (!p[0]) return fail("Product not found", 404, "NOT_FOUND");
  const page = Math.max(1, Number(q.get("page") || 1));
  const limit = 10;
  const [total, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(s.reviews).where(and(eq(s.reviews.productId, p[0].id), eq(s.reviews.adminHidden, false))),
    db.select({
      id: s.reviews.id, rating: s.reviews.rating, title: s.reviews.title, comment: s.reviews.comment,
      images: s.reviews.images, verifiedPurchase: s.reviews.verifiedPurchase, vendorReply: s.reviews.vendorReply,
      helpfulCount: s.reviews.helpfulCount, createdAt: s.reviews.createdAt, userName: s.users.name,
    })
      .from(s.reviews)
      .innerJoin(s.users, eq(s.reviews.userId, s.users.id))
      .where(and(eq(s.reviews.productId, p[0].id), eq(s.reviews.adminHidden, false)))
      .orderBy(desc(s.reviews.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  return ok({ reviews: rows, total: total[0]?.n ?? 0, page });
}

// POST /api/reviews {productId, rating, title?, comment?} (upsert)
// POST /api/reviews {op:'helpful', id} | {op:'reply', id, text} (vendor)
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (b.value.op === "helpful") {
    const id = b.value.id as string;
    if (!id) return fail("Review required", 400, "BAD_REQUEST");
    await db.update(s.reviews).set({ helpfulCount: sql`${s.reviews.helpfulCount} + 1` }).where(eq(s.reviews.id, id));
    return ok({ done: true });
  }

  if (b.value.op === "reply") {
    const schema = z.object({ id: z.string().uuid(), text: z.string().min(1).max(1000) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const r = await db.select().from(s.reviews).where(eq(s.reviews.id, p.data.id)).limit(1);
    if (!r[0]) return fail("Review not found", 404, "NOT_FOUND");
    const prod = await db.select().from(s.products).where(eq(s.products.id, r[0].productId)).limit(1);
    const isOwner = prod[0]?.vendorId === auth.user.id;
    if (!isOwner && auth.user.role !== "admin") return fail("Only the seller can reply", 403, "FORBIDDEN");
    await db.update(s.reviews).set({ vendorReply: p.data.text }).where(eq(s.reviews.id, p.data.id));
    await notify(r[0].userId, "review", "Seller replied to your review", `${prod[0]?.name}: ${p.data.text.slice(0, 120)}`, `/products/${prod[0]?.slug}#reviews`);
    return ok({ done: true });
  }

  const schema = z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(120).optional(),
    comment: z.string().max(2000).optional(),
  });
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  const prod = await db.select().from(s.products).where(eq(s.products.id, p.data.productId)).limit(1);
  if (!prod[0]) return fail("Product not found", 404, "NOT_FOUND");

  // verified purchase check
  const bought = await db.select({ id: s.orders.id })
    .from(s.orders)
    .innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
    .where(and(eq(s.orders.userId, auth.user.id), eq(s.orders.status, "delivered"), eq(s.orderItems.productId, p.data.productId)))
    .limit(1);
  const verified = bought.length > 0;
  const existing = await db.select().from(s.reviews).where(and(eq(s.reviews.productId, p.data.productId), eq(s.reviews.userId, auth.user.id))).limit(1);
  if (existing[0]) {
    const [u] = await db.update(s.reviews).set({
      rating: p.data.rating, title: p.data.title || null, comment: p.data.comment || null,
      verifiedPurchase: existing[0].verifiedPurchase || verified, orderId: bought[0]?.id ?? existing[0].orderId,
    }).where(eq(s.reviews.id, existing[0].id)).returning();
    await refreshAggregates(p.data.productId);
    return ok({ review: u });
  }
  const [created] = await db.insert(s.reviews).values({
    productId: p.data.productId, userId: auth.user.id, orderId: bought[0]?.id ?? null,
    rating: p.data.rating, title: p.data.title || null, comment: p.data.comment || null, verifiedPurchase: verified,
  }).returning();
  await refreshAggregates(p.data.productId);
  await notify(prod[0].vendorId, "review", "New product review", `${"★".repeat(p.data.rating)} on ${prod[0].name}`, `/vendor?tab=reviews`);
  return ok({ review: created }, 201);
}

// PATCH /api/reviews {id, hide?} — admin moderation
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "admin") return fail("Forbidden", 403, "FORBIDDEN");
  const b = await parseBody<{ id?: string; hide?: boolean }>(req);
  if ("error" in b) return b.error;
  if (!b.value.id) return fail("Review required", 400, "BAD_REQUEST");
  const [u] = await db.update(s.reviews).set({ adminHidden: !!b.value.hide }).where(eq(s.reviews.id, b.value.id)).returning();
  if (u) await refreshAggregates(u.productId);
  return ok({ done: true });
}
