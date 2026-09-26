import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { transitionOrder, requestReturn } from "@/lib/order-service";

// GET /api/orders — list | ?id= — detail | ?view=returns — my returns
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const q = req.nextUrl.searchParams;
  const id = q.get("id");
  const view = q.get("view");

  if (view === "returns") {
    const rows = await db
      .select({
        ret: s.returns, orderNumber: s.orders.orderNumber, orderStatus: s.orders.status,
        itemName: s.orderItems.nameSnapshot, itemQty: s.orderItems.quantity, itemSubtotal: s.orderItems.subtotal,
        shopName: s.vendors.shopName,
      })
      .from(s.returns)
      .innerJoin(s.orders, eq(s.returns.orderId, s.orders.id))
      .innerJoin(s.orderItems, eq(s.returns.orderItemId, s.orderItems.id))
      .leftJoin(s.vendors, eq(s.returns.vendorId, s.vendors.userId))
      .where(eq(s.returns.userId, auth.user.id))
      .orderBy(desc(s.returns.createdAt));
    return ok({ returns: rows });
  }

  if (id) {
    const o = await db.select().from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.userId, auth.user.id))).limit(1);
    if (!o[0]) return fail("Order not found", 404, "NOT_FOUND");
    const [items, history, payment, rets] = await Promise.all([
      db.select({
        item: s.orderItems, slug: s.products.slug, vendorShop: s.vendors.shopName, vendorSlug: s.vendors.slug,
      })
        .from(s.orderItems)
        .leftJoin(s.products, eq(s.orderItems.productId, s.products.id))
        .leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId))
        .where(eq(s.orderItems.orderId, id)),
      db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, id)).orderBy(s.orderStatusHistory.createdAt),
      db.select().from(s.payments).where(eq(s.payments.orderId, id)).orderBy(desc(s.payments.createdAt)).limit(1),
      db.select().from(s.returns).where(eq(s.returns.orderId, id)),
    ]);
    const zone = o[0].deliveryZoneId
      ? (await db.select().from(s.deliveryZones).where(eq(s.deliveryZones.id, o[0].deliveryZoneId)).limit(1))[0] ?? null
      : null;
    return ok({ order: o[0], items, history, payment: payment[0] ?? null, returns: rets, zone });
  }

  const page = Math.max(1, Number(q.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(q.get("limit") || 10)));
  const [total, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.userId, auth.user.id)),
    db.select({
      order: s.orders,
      itemCount: sql<number>`(SELECT count(*)::int FROM order_items oi WHERE oi.order_id = ${s.orders.id})`,
      preview: sql<string>`(SELECT oi2.name_snapshot FROM order_items oi2 WHERE oi2.order_id = ${s.orders.id} LIMIT 1)`,
      previewColor: sql<string>`(SELECT oi2.image_color FROM order_items oi2 WHERE oi2.order_id = ${s.orders.id} LIMIT 1)`,
      previewImage: sql<string | null>`(SELECT oi3.image_url FROM order_items oi3 WHERE oi3.order_id = ${s.orders.id} AND oi3.image_url IS NOT NULL LIMIT 1)`,
    })
      .from(s.orders)
      .where(eq(s.orders.userId, auth.user.id))
      .orderBy(desc(s.orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  return ok({ orders: rows, total: total[0]?.n ?? 0, page });
}

// POST /api/orders {op:'cancel', id, reason?} | {op:'return', id, orderItemId, reason, evidenceNote?}
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const op = b.value.op as string;
  const id = b.value.id as string;
  if (!id) return fail("Order required", 400, "BAD_REQUEST");
  const o = await db.select().from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.userId, auth.user.id))).limit(1);
  if (!o[0]) return fail("Order not found", 404, "NOT_FOUND");

  try {
    if (op === "cancel") {
      const schema = z.object({ reason: z.string().max(300).optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      if (!["pending_payment", "payment_failed", "confirmed", "processing"].includes(o[0].status)) {
        return fail(`Order cannot be cancelled at "${o[0].status}" stage. Contact support.`, 400, "CANCEL_NOT_ALLOWED");
      }
      const order = await transitionOrder(id, "cancelled", auth.user.id, auth.user.name, p.data.reason || "Cancelled by customer", clientIp(req));
      return ok({ order });
    }
    if (op === "return") {
      const schema = z.object({ orderItemId: z.string().uuid(), reason: z.string().min(3).max(200), evidenceNote: z.string().max(1000).optional() });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      const ret = await requestReturn({ userId: auth.user.id, orderId: id, orderItemId: p.data.orderItemId, reason: p.data.reason, evidenceNote: p.data.evidenceNote, ip: clientIp(req) });
      return ok({ ret }, 201);
    }
    return fail("Unknown operation", 400, "BAD_REQUEST");
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    return fail(err.message || "Request failed", err.status || 500, err.code || "ORDER_FAILED");
  }
}
