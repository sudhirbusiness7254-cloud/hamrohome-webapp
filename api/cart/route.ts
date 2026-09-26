import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ok, fail, parseBody } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { computeTotals } from "@/lib/pricing";

async function identity(req: NextRequest) {
  const session = await getSessionUser();
  const guest = req.headers.get("x-guest-token");
  return { userId: session?.id ?? null, guest: guest && guest.length >= 8 ? guest : null };
}

async function getOrCreateCart(userId: string | null, guest: string | null) {
  if (userId) {
    const c = await db.select().from(s.carts).where(eq(s.carts.userId, userId)).limit(1);
    if (c[0]) return c[0];
    const [n] = await db.insert(s.carts).values({ userId }).returning();
    return n;
  }
  if (guest) {
    const c = await db.select().from(s.carts).where(eq(s.carts.guestToken, guest)).limit(1);
    if (c[0]) return c[0];
    const [n] = await db.insert(s.carts).values({ guestToken: guest }).returning();
    return n;
  }
  return null;
}

// GET /api/cart?coupon=&zoneId=&method=&district= — full summary
export async function GET(req: NextRequest) {
  const { userId, guest } = await identity(req);
  if (!userId && !guest) {
    return ok({ lines: [], count: 0, subtotal: 0, discount: 0, tax: 0, deliveryFee: 0, grandTotal: 0, coupon: null, couponError: null, zone: null, method: "standard" });
  }
  const q = req.nextUrl.searchParams;
  const t = await computeTotals(db, {
    userId, guestToken: guest,
    couponCode: q.get("coupon"), zoneId: q.get("zoneId"),
    district: q.get("district"), method: q.get("method"),
  });
  return ok(t);
}

// POST /api/cart {productId, variantId?, qty?} — add
export async function POST(req: NextRequest) {
  const { userId, guest } = await identity(req);
  if (!userId && !guest) return fail("Session required", 400, "NO_SESSION");
  const b = await parseBody<{ productId?: string; variantId?: string | null; qty?: number }>(req);
  if ("error" in b) return b.error;
  const { productId, qty = 1 } = b.value;
  let { variantId = null } = b.value;
  if (!productId) return fail("Product required", 400, "BAD_REQUEST");
  if (qty < 1 || qty > 99) return fail("Quantity must be 1-99", 400, "BAD_QTY");

  const p = await db.select().from(s.products).where(eq(s.products.id, productId)).limit(1);
  const product = p[0];
  if (!product || product.status !== "approved") return fail("Product is unavailable", 404, "UNAVAILABLE");

  // default variant if product has variants
  if (!variantId) {
    const vs = await db.select({ id: s.productVariants.id }).from(s.productVariants).where(and(eq(s.productVariants.productId, productId), eq(s.productVariants.isActive, true))).limit(1);
    if (vs[0]) variantId = vs[0].id;
  }
  if (variantId) {
    const v = await db.select().from(s.productVariants).where(eq(s.productVariants.id, variantId)).limit(1);
    if (!v[0] || v[0].productId !== productId || !v[0].isActive) return fail("Invalid variant", 400, "BAD_VARIANT");
    const avail = v[0].stock - v[0].reservedStock;
    if (qty > avail) return fail(`Only ${Math.max(0, avail)} available`, 409, "OUT_OF_STOCK");
  } else {
    const avail = product.stock - product.reservedStock;
    if (qty > avail) return fail(`Only ${Math.max(0, avail)} available`, 409, "OUT_OF_STOCK");
  }

  const cart = await getOrCreateCart(userId, guest);
  if (!cart) return fail("Session required", 400, "NO_SESSION");
  const existing = await db.select().from(s.cartItems).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.productId, productId))).limit(20);
  const dup = existing.find((e) => (e.variantId ?? null) === (variantId ?? null));
  if (dup) {
    await db.update(s.cartItems).set({ quantity: dup.quantity + qty, updatedAt: new Date() }).where(eq(s.cartItems.id, dup.id));
  } else {
    await db.insert(s.cartItems).values({ cartId: cart.id, productId, variantId, quantity: qty });
  }
  const t = await computeTotals(db, { userId, guestToken: guest });
  return ok({ count: t.count, lines: t.lines });
}

// PATCH /api/cart {id, qty} — update quantity
export async function PATCH(req: NextRequest) {
  const { userId, guest } = await identity(req);
  const b = await parseBody<{ id?: string; qty?: number }>(req);
  if ("error" in b) return b.error;
  if (!b.value.id || typeof b.value.qty !== "number") return fail("Item and quantity required", 400, "BAD_REQUEST");
  const qty = Math.floor(b.value.qty);
  const item = await db.select().from(s.cartItems).where(eq(s.cartItems.id, b.value.id)).limit(1);
  if (!item[0]) return fail("Item not found", 404, "NOT_FOUND");
  // ownership check
  const cart = await db.select().from(s.carts).where(eq(s.carts.id, item[0].cartId)).limit(1);
  const owned = userId ? cart[0]?.userId === userId : cart[0]?.guestToken === guest;
  if (!owned) return fail("Item not found", 404, "NOT_FOUND");
  if (qty <= 0) {
    await db.delete(s.cartItems).where(eq(s.cartItems.id, item[0].id));
  } else {
    if (qty > 99) return fail("Quantity must be 1-99", 400, "BAD_QTY");
    await db.update(s.cartItems).set({ quantity: qty, updatedAt: new Date() }).where(eq(s.cartItems.id, item[0].id));
  }
  const t = await computeTotals(db, { userId, guestToken: guest });
  return ok({ count: t.count });
}

// DELETE /api/cart?id= — remove item, or clear all
export async function DELETE(req: NextRequest) {
  const { userId, guest } = await identity(req);
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const item = await db.select().from(s.cartItems).where(eq(s.cartItems.id, id)).limit(1);
    if (item[0]) {
      const cart = await db.select().from(s.carts).where(eq(s.carts.id, item[0].cartId)).limit(1);
      const owned = userId ? cart[0]?.userId === userId : cart[0]?.guestToken === guest;
      if (owned) await db.delete(s.cartItems).where(eq(s.cartItems.id, id));
    }
  } else {
    const cart = userId
      ? await db.select().from(s.carts).where(eq(s.carts.userId, userId)).limit(1)
      : guest ? await db.select().from(s.carts).where(eq(s.carts.guestToken, guest)).limit(1) : [];
    if (cart[0]) await db.delete(s.cartItems).where(eq(s.cartItems.cartId, cart[0].id));
  }
  const t = await computeTotals(db, { userId, guestToken: guest });
  return ok({ count: t.count });
}

export async function totalsCount() {
  void sql;
}
