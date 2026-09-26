import "server-only";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { computeTotals, findZoneForDistrict, methodEnabled, getActiveFlashMap, type CartLine } from "./pricing";
import { notify, audit } from "./notify";
import { ORDER_STATUS_META } from "./format";

type Ex = typeof db;

export function orderError(message: string, status = 400, code = "ORDER_ERROR"): Error {
  return Object.assign(new Error(message), { status, code });
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["confirmed", "payment_failed", "cancelled"],
  payment_failed: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested", "refunded"],
  return_requested: ["return_approved", "return_rejected", "delivered"],
  return_approved: ["refunded"],
  return_rejected: ["delivered"],
  cancelled: [],
  refunded: [],
};

type OrderItemRow = { productId: string | null; variantId: string | null; quantity: number; subtotal: number };

// --- inventory helpers ------------------------------------------------------
async function applySale(ex: Ex, items: OrderItemRow[], actorId?: string | null) {
  for (const it of items) {
    if (!it.productId) continue;
    const p = await ex.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, it.productId)).limit(1);
    const newStock = Math.max(0, (p[0]?.stock ?? 0) - it.quantity);
    await ex.update(s.products).set({ stock: newStock, soldCount: sql`${s.products.soldCount} + ${it.quantity}` }).where(eq(s.products.id, it.productId));
    if (it.variantId) {
      await ex.update(s.productVariants).set({ stock: sql`GREATEST(0, ${s.productVariants.stock} - ${it.quantity})` }).where(eq(s.productVariants.id, it.variantId));
    }
    await ex.insert(s.inventoryTransactions).values({
      productId: it.productId, variantId: it.variantId, type: "sale",
      quantity: -it.quantity, balanceAfter: newStock, note: "Order confirmed", actorId: actorId ?? null,
    });
  }
}

async function applyReserve(ex: Ex, lines: CartLine[]) {
  for (const l of lines) {
    await ex.update(s.products).set({ reservedStock: sql`${s.products.reservedStock} + ${l.quantity}` }).where(eq(s.products.id, l.productId));
    if (l.variantId) {
      await ex.update(s.productVariants).set({ reservedStock: sql`${s.productVariants.reservedStock} + ${l.quantity}` }).where(eq(s.productVariants.id, l.variantId));
    }
    const p = await ex.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, l.productId)).limit(1);
    await ex.insert(s.inventoryTransactions).values({
      productId: l.productId, variantId: l.variantId, type: "reservation",
      quantity: l.quantity, balanceAfter: p[0]?.stock ?? 0, note: "Checkout reservation",
    });
  }
}

async function releaseReserve(ex: Ex, items: OrderItemRow[], actorId?: string | null) {
  for (const it of items) {
    if (!it.productId) continue;
    await ex.update(s.products).set({ reservedStock: sql`GREATEST(0, ${s.products.reservedStock} - ${it.quantity})` }).where(eq(s.products.id, it.productId));
    if (it.variantId) {
      await ex.update(s.productVariants).set({ reservedStock: sql`GREATEST(0, ${s.productVariants.reservedStock} - ${it.quantity})` }).where(eq(s.productVariants.id, it.variantId));
    }
    const p = await ex.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, it.productId)).limit(1);
    await ex.insert(s.inventoryTransactions).values({
      productId: it.productId, variantId: it.variantId, type: "release",
      quantity: it.quantity, balanceAfter: p[0]?.stock ?? 0, note: "Reservation released", actorId: actorId ?? null,
    });
  }
}

async function restock(ex: Ex, items: OrderItemRow[], note: string, actorId?: string | null) {
  for (const it of items) {
    if (!it.productId) continue;
    await ex.update(s.products).set({
      stock: sql`${s.products.stock} + ${it.quantity}`,
      soldCount: sql`GREATEST(0, ${s.products.soldCount} - ${it.quantity})`,
    }).where(eq(s.products.id, it.productId));
    if (it.variantId) {
      await ex.update(s.productVariants).set({ stock: sql`${s.productVariants.stock} + ${it.quantity}` }).where(eq(s.productVariants.id, it.variantId));
    }
    const p = await ex.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, it.productId)).limit(1);
    await ex.insert(s.inventoryTransactions).values({
      productId: it.productId, variantId: it.variantId, type: "return",
      quantity: it.quantity, balanceAfter: p[0]?.stock ?? 0, note, actorId: actorId ?? null,
    });
  }
}

async function adjustFlash(ex: Ex, productIds: string[], delta: number) {
  // adjust soldCount on the active flash rows for these products
  const now = new Date();
  for (const pid of productIds) {
    const rows = await ex
      .select({ id: s.flashSaleProducts.id })
      .from(s.flashSaleProducts)
      .innerJoin(s.flashSales, eq(s.flashSaleProducts.flashSaleId, s.flashSales.id))
      .where(and(eq(s.flashSaleProducts.productId, pid), eq(s.flashSales.isActive, true)));
    for (const r of rows) {
      await ex.update(s.flashSaleProducts).set({ soldCount: sql`GREATEST(0, ${s.flashSaleProducts.soldCount} + ${delta})` }).where(eq(s.flashSaleProducts.id, r.id));
    }
  }
  void now;
}

// --- create order ------------------------------------------------------------
export async function createOrder(input: {
  userId: string;
  addressId: string;
  zoneId?: string | null;
  method?: string;
  paymentMethod: "cod" | "esewa" | "khalti";
  couponCode?: string | null;
  note?: string | null;
  ip?: string | null;
}) {
  const method = input.method || "standard";
  const result = await db.transaction(async (tx) => {
    const ex = tx as unknown as Ex;
    const addr = await ex.select().from(s.addresses).where(and(eq(s.addresses.id, input.addressId), eq(s.addresses.userId, input.userId))).limit(1);
    const address = addr[0];
    if (!address) throw orderError("Delivery address not found", 404, "ADDRESS_NOT_FOUND");

    let zone = null as Awaited<ReturnType<typeof findZoneForDistrict>>;
    if (input.zoneId) {
      const z = await ex.select().from(s.deliveryZones).where(eq(s.deliveryZones.id, input.zoneId)).limit(1);
      zone = z[0] ?? null;
    }
    if (!zone) zone = await findZoneForDistrict(ex, address.district);
    if (!methodEnabled(zone, method)) throw orderError("Delivery method not available in your zone", 400, "METHOD_UNAVAILABLE");
    if (input.paymentMethod === "cod" && zone && !zone.codEnabled) throw orderError("Cash on Delivery is not available in your zone", 400, "COD_UNAVAILABLE");

    const t = await computeTotals(ex, {
      userId: input.userId, couponCode: input.couponCode ?? null,
      zoneId: zone?.id ?? null, district: address.district, method,
    });
    if (t.lines.length === 0) throw orderError("Your cart is empty", 400, "EMPTY_CART");
    if (input.couponCode && t.couponError) throw orderError(t.couponError, 400, "COUPON_INVALID");
    for (const l of t.lines) {
      if (l.quantity > l.available) throw orderError(`"${l.name}" only has ${l.available} left in stock`, 409, "OUT_OF_STOCK");
    }

    const orderNumber = `BZ-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
    const isCod = input.paymentMethod === "cod";
    const estDays = method === "same_day" ? 0 : method === "express" ? (zone?.estDaysMin ?? 1) : (zone?.estDaysMax ?? 4);
    const estimated = new Date(Date.now() + estDays * 86400_000);

    const [order] = await tx.insert(s.orders).values({
      orderNumber, userId: input.userId,
      addressSnapshot: {
        label: address.label, recipient: address.recipient, phone: address.phone,
        province: address.province, district: address.district, city: address.city,
        ward: address.ward, street: address.street, landmark: address.landmark,
      },
      deliveryZoneId: zone?.id ?? null, deliveryMethod: method, customerNote: input.note ?? null,
      subtotal: t.subtotal, discountTotal: t.discount, taxTotal: t.tax, deliveryFee: t.deliveryFee,
      grandTotal: t.grandTotal, couponId: t.coupon?.id ?? null, couponCode: t.coupon?.code ?? null,
      status: isCod ? "confirmed" : "pending_payment",
      paymentMethod: input.paymentMethod, paymentStatus: "pending",
      estimatedDelivery: estimated,
    }).returning();

    for (const l of t.lines) {
      await tx.insert(s.orderItems).values({
        orderId: order.id, productId: l.productId, variantId: l.variantId,
        nameSnapshot: l.name, skuSnapshot: l.sku, color: l.color, size: l.size,
        imageColor: l.imageColor, imageUrl: l.imageUrl, unitPrice: l.unitPrice, quantity: l.quantity,
        subtotal: l.unitPrice * l.quantity,
      });
    }
    await tx.insert(s.orderStatusHistory).values({
      orderId: order.id, fromStatus: null, toStatus: order.status,
      note: isCod ? "Order placed (COD)" : "Order placed, awaiting payment", actorId: input.userId,
    });

    const itemRows: OrderItemRow[] = t.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, subtotal: l.unitPrice * l.quantity }));
    if (isCod) await applySale(ex, itemRows, input.userId);
    else await applyReserve(ex, t.lines);

    // flash counters
    const flash = await getActiveFlashMap(ex);
    for (const l of t.lines) {
      if (flash.has(l.productId)) {
        const rows = await ex.select({ id: s.flashSaleProducts.id }).from(s.flashSaleProducts).where(eq(s.flashSaleProducts.productId, l.productId));
        for (const r of rows) {
          await ex.update(s.flashSaleProducts).set({ soldCount: sql`${s.flashSaleProducts.soldCount} + ${l.quantity}` }).where(eq(s.flashSaleProducts.id, r.id));
        }
      }
    }

    if (t.coupon) {
      await tx.insert(s.couponUsages).values({ couponId: t.coupon.id, userId: input.userId, orderId: order.id, discount: t.coupon.discount });
    }

    let txnId: string | null = null;
    if (!isCod) {
      txnId = `TXN-${input.paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
      await tx.insert(s.payments).values({ orderId: order.id, provider: input.paymentMethod, amount: t.grandTotal, status: "pending", transactionId: txnId });
    }

    if (t.cartId) await tx.delete(s.cartItems).where(eq(s.cartItems.cartId, t.cartId));

    return { order, txnId, lines: t.lines, zoneName: zone?.name ?? null };
  });

  const { order, txnId, lines } = result;
  // post-commit notifications (best effort)
  await notify(input.userId, "order", `Order ${order.orderNumber} placed`, `Total Rs. ${order.grandTotal.toLocaleString()} — ${order.status === "confirmed" ? "confirmed" : "complete payment to confirm"}`, `/checkout/success?order=${order.id}`);
  const vendorIds = [...new Set(lines.map((l) => l.vendorId))];
  for (const vid of vendorIds) {
    await notify(vid, "order", "New order received", `Order ${order.orderNumber} contains your products.`, `/vendor?tab=orders`);
  }
  // low stock alerts
  for (const l of lines) {
    const p = await db.select({ stock: s.products.stock, reservedStock: s.products.reservedStock, lowStockThreshold: s.products.lowStockThreshold, name: s.products.name }).from(s.products).where(eq(s.products.id, l.productId)).limit(1);
    const row = p[0];
    if (row && row.stock - row.reservedStock <= row.lowStockThreshold) {
      await notify(l.vendorId, "stock", "Low stock alert", `"${row.name}" is running low.`, `/vendor?tab=products`);
    }
  }
  await audit(input.userId, null, "order.create", "order", order.id, { number: order.orderNumber, total: order.grandTotal }, input.ip ?? null);

  return {
    orderId: order.id, orderNumber: order.orderNumber, grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod, status: order.status,
    txnId, redirectUrl: txnId ? `/payment/return?txn=${txnId}` : `/checkout/success?order=${order.id}`,
  };
}

// --- status transitions -------------------------------------------------------
export async function transitionOrder(
  orderId: string,
  to: string,
  actorId?: string | null,
  actorName?: string | null,
  note?: string | null,
  ip?: string | null,
) {
  const rows = await db.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) throw orderError("Order not found", 404, "ORDER_NOT_FOUND");
  const from = order.status;
  if (from === to) return order;
  if (!(ALLOWED_TRANSITIONS[from] || []).includes(to)) {
    throw orderError(`Cannot move order from ${from} to ${to}`, 400, "INVALID_TRANSITION");
  }
  if (to === "confirmed" && (from === "pending_payment" || from === "payment_failed")) {
    if (order.paymentMethod !== "cod" && order.paymentStatus !== "verified") {
      throw orderError("Online payment must be verified before confirming", 400, "PAYMENT_UNVERIFIED");
    }
  }

  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  const itemRows: OrderItemRow[] = items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, subtotal: i.subtotal }));

  await db.transaction(async (tx) => {
    const ex = tx as unknown as Ex;
    let paymentStatus = order.paymentStatus;
    if (to === "delivered" && order.paymentMethod === "cod") paymentStatus = "verified";
    if (to === "cancelled" && order.paymentStatus === "verified") paymentStatus = "refunded";
    if (to === "refunded") paymentStatus = "refunded";

    await tx.update(s.orders).set({ status: to as typeof order.status, paymentStatus: paymentStatus as typeof order.paymentStatus, updatedAt: new Date() }).where(eq(s.orders.id, orderId));
    await tx.insert(s.orderStatusHistory).values({ orderId, fromStatus: from, toStatus: to, note: note ?? null, actorId: actorId ?? null });

    if (to === "confirmed" && (from === "pending_payment" || from === "payment_failed")) {
      await releaseReserve(ex, itemRows, actorId);
      await applySale(ex, itemRows, actorId);
    }
    if (to === "cancelled") {
      if (from === "pending_payment" || from === "payment_failed") {
        await releaseReserve(ex, itemRows, actorId);
      } else {
        await restock(ex, itemRows, "Order cancelled", actorId);
      }
      if (order.paymentStatus === "verified" || order.paymentStatus === "pending") {
        await tx.update(s.payments).set({ status: order.paymentStatus === "verified" ? "refunded" : "cancelled" }).where(eq(s.payments.orderId, orderId));
      }
      if (order.couponId) await tx.delete(s.couponUsages).where(eq(s.couponUsages.orderId, orderId));
      const pids = [...new Set(itemRows.map((i) => i.productId).filter(Boolean) as string[])];
      await adjustFlash(ex, pids, -itemRows.reduce((a, i) => a + i.quantity, 0) > 0 ? 0 : 0); // no-op guard
      for (const it of itemRows) if (it.productId) await adjustFlash(ex, [it.productId], -it.quantity);
    }
    if (to === "delivered") {
      // credit vendor wallets
      const withVendor = await ex
        .select({ subtotal: s.orderItems.subtotal, vendorId: s.products.vendorId })
        .from(s.orderItems)
        .leftJoin(s.products, eq(s.orderItems.productId, s.products.id))
        .where(eq(s.orderItems.orderId, orderId));
      const byVendor = new Map<string, number>();
      for (const w of withVendor) {
        if (!w.vendorId) continue;
        byVendor.set(w.vendorId, (byVendor.get(w.vendorId) ?? 0) + w.subtotal);
      }
      for (const [vid, gross] of byVendor) {
        const v = await ex.select({ commissionRate: s.vendors.commissionRate }).from(s.vendors).where(eq(s.vendors.userId, vid)).limit(1);
        const rate = Number(v[0]?.commissionRate ?? 10);
        const commission = Math.round((gross * rate) / 100);
        const bal = await ex.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, vid));
        let running = bal[0]?.n ?? 0;
        running += gross;
        await tx.insert(s.vendorTransactions).values({ vendorId: vid, type: "sale", amount: gross, balanceAfter: running, orderId, note: `Order ${order.orderNumber} delivered` });
        running -= commission;
        await tx.insert(s.vendorTransactions).values({ vendorId: vid, type: "commission", amount: -commission, balanceAfter: running, orderId, note: `Commission ${rate}% on ${order.orderNumber}` });
      }
      if (order.paymentMethod === "cod") {
        await tx.insert(s.payments).values({ orderId, provider: "cod", amount: order.grandTotal, status: "verified", transactionId: `COD-${order.orderNumber}`, signatureVerified: true, verifiedAt: new Date() });
      }
    }
    if (to === "refunded") {
      await restock(ex, itemRows, "Order refunded", actorId);
      await tx.update(s.payments).set({ status: "refunded" }).where(eq(s.payments.orderId, orderId));
      // debit vendors
      const withVendor = await ex
        .select({ subtotal: s.orderItems.subtotal, vendorId: s.products.vendorId })
        .from(s.orderItems)
        .leftJoin(s.products, eq(s.orderItems.productId, s.products.id))
        .where(eq(s.orderItems.orderId, orderId));
      const byVendor = new Map<string, number>();
      for (const w of withVendor) {
        if (!w.vendorId) continue;
        byVendor.set(w.vendorId, (byVendor.get(w.vendorId) ?? 0) + w.subtotal);
      }
      for (const [vid, gross] of byVendor) {
        const v = await ex.select({ commissionRate: s.vendors.commissionRate }).from(s.vendors).where(eq(s.vendors.userId, vid)).limit(1);
        const net = gross - Math.round((gross * Number(v[0]?.commissionRate ?? 10)) / 100);
        const bal = await ex.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, vid));
        const running = (bal[0]?.n ?? 0) - net;
        await tx.insert(s.vendorTransactions).values({ vendorId: vid, type: "refund", amount: -net, balanceAfter: running, orderId, note: `Refund for ${order.orderNumber}` });
      }
    }
  });

  const meta = ORDER_STATUS_META[to];
  await notify(order.userId, "order", `Order ${order.orderNumber}: ${meta?.label ?? to}`, note ?? `Status updated to ${meta?.label ?? to}.`, `/account?tab=orders&order=${orderId}`);
  await audit(actorId ?? null, actorName ?? null, "order.status", "order", orderId, { from, to, note }, ip ?? null);
  const updated = await db.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
  return updated[0];
}

// --- returns ------------------------------------------------------------------
export async function requestReturn(input: { userId: string; orderId: string; orderItemId: string; reason: string; evidenceNote?: string | null; ip?: string | null }) {
  const o = await db.select().from(s.orders).where(eq(s.orders.id, input.orderId)).limit(1);
  const order = o[0];
  if (!order || order.userId !== input.userId) throw orderError("Order not found", 404, "ORDER_NOT_FOUND");
  if (order.status !== "delivered") throw orderError("Only delivered orders can be returned", 400, "RETURN_NOT_ALLOWED");
  const it = await db.select().from(s.orderItems).where(and(eq(s.orderItems.id, input.orderItemId), eq(s.orderItems.orderId, input.orderId))).limit(1);
  const item = it[0];
  if (!item) throw orderError("Order item not found", 404, "ITEM_NOT_FOUND");
  const existing = await db.select().from(s.returns).where(eq(s.returns.orderItemId, input.orderItemId));
  if (existing.some((r) => ["requested", "approved", "picked"].includes(r.status))) {
    throw orderError("A return is already in progress for this item", 409, "RETURN_EXISTS");
  }
  let vendorId: string | null = null;
  if (item.productId) {
    const p = await db.select({ vendorId: s.products.vendorId }).from(s.products).where(eq(s.products.id, item.productId)).limit(1);
    vendorId = p[0]?.vendorId ?? null;
  }
  const [ret] = await db.insert(s.returns).values({
    orderId: input.orderId, orderItemId: input.orderItemId, userId: input.userId,
    vendorId, reason: input.reason, evidenceNote: input.evidenceNote ?? null, status: "requested",
  }).returning();
  if (order.status === "delivered") {
    await transitionOrder(input.orderId, "return_requested", input.userId, null, `Return requested: ${input.reason}`, input.ip ?? null);
  }
  if (vendorId) await notify(vendorId, "return", "New return request", `Order ${order.orderNumber} — ${item.nameSnapshot}`, `/vendor?tab=returns`);
  await audit(input.userId, null, "return.request", "return", ret.id, { orderId: input.orderId }, input.ip ?? null);
  return ret;
}

export async function resolveReturn(input: { returnId: string; action: "approve" | "reject" | "picked" | "refund"; actorId: string; actorName?: string | null; note?: string | null; ip?: string | null }) {
  const r = await db.select().from(s.returns).where(eq(s.returns.id, input.returnId)).limit(1);
  const ret = r[0];
  if (!ret) throw orderError("Return not found", 404, "RETURN_NOT_FOUND");
  const o = await db.select().from(s.orders).where(eq(s.orders.id, ret.orderId)).limit(1);
  const order = o[0]!;
  const it = await db.select().from(s.orderItems).where(eq(s.orderItems.id, ret.orderItemId)).limit(1);
  const item = it[0]!;

  if (input.action === "approve") {
    if (ret.status !== "requested") throw orderError("Only requested returns can be approved", 400, "INVALID_RETURN_STATE");
    await db.update(s.returns).set({ status: "approved", resolutionNote: input.note ?? null }).where(eq(s.returns.id, ret.id));
    if (order.status === "return_requested") await transitionOrder(order.id, "return_approved", input.actorId, input.actorName ?? null, input.note ?? "Return approved", input.ip ?? null);
    await notify(order.userId, "return", "Return approved", `Pickup will be arranged for ${item.nameSnapshot}.`, `/account?tab=returns`);
  } else if (input.action === "reject") {
    if (ret.status !== "requested") throw orderError("Only requested returns can be rejected", 400, "INVALID_RETURN_STATE");
    await db.update(s.returns).set({ status: "rejected", resolutionNote: input.note ?? null, resolvedAt: new Date() }).where(eq(s.returns.id, ret.id));
    const others = await db.select().from(s.returns).where(eq(s.returns.orderId, order.id));
    if (!others.some((x) => x.id !== ret.id && ["requested", "approved", "picked"].includes(x.status)) && order.status === "return_requested") {
      await transitionOrder(order.id, "delivered", input.actorId, input.actorName ?? null, "Return rejected", input.ip ?? null);
    }
    await notify(order.userId, "return", "Return rejected", input.note ?? `Return for ${item.nameSnapshot} was rejected.`, `/account?tab=returns`);
  } else if (input.action === "picked") {
    if (ret.status !== "approved") throw orderError("Only approved returns can be marked picked", 400, "INVALID_RETURN_STATE");
    await db.update(s.returns).set({ status: "picked" }).where(eq(s.returns.id, ret.id));
    await notify(order.userId, "return", "Return picked up", `${item.nameSnapshot} received. Refund is being processed.`, `/account?tab=returns`);
  } else if (input.action === "refund") {
    if (!["approved", "picked"].includes(ret.status)) throw orderError("Only approved/picked returns can be refunded", 400, "INVALID_RETURN_STATE");
    await db.transaction(async (tx) => {
      const ex = tx as unknown as Ex;
      await tx.update(s.returns).set({ status: "refunded", refundAmount: item.subtotal, resolvedAt: new Date(), resolutionNote: input.note ?? null }).where(eq(s.returns.id, ret.id));
      await restock(ex, [{ productId: item.productId, variantId: item.variantId, quantity: item.quantity, subtotal: item.subtotal }], "Return refunded", input.actorId);
      if (ret.vendorId) {
        const v = await ex.select({ commissionRate: s.vendors.commissionRate }).from(s.vendors).where(eq(s.vendors.userId, ret.vendorId)).limit(1);
        const net = item.subtotal - Math.round((item.subtotal * Number(v[0]?.commissionRate ?? 10)) / 100);
        const bal = await ex.select({ n: sql<number>`COALESCE(SUM(amount),0)::int` }).from(s.vendorTransactions).where(eq(s.vendorTransactions.vendorId, ret.vendorId));
        const running = (bal[0]?.n ?? 0) - net;
        await tx.insert(s.vendorTransactions).values({ vendorId: ret.vendorId, type: "refund", amount: -net, balanceAfter: running, orderId: order.id, note: `Refund for ${item.nameSnapshot}` });
      }
    });
    const others = await db.select().from(s.returns).where(eq(s.returns.orderId, order.id));
    const orderItems = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
    const refundedIds = new Set(others.filter((x) => x.status === "refunded").map((x) => x.orderItemId));
    if (orderItems.every((x) => refundedIds.has(x.id))) {
      if (order.status === "return_approved" || order.status === "return_requested") {
        await db.update(s.orders).set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() }).where(eq(s.orders.id, order.id));
        await db.insert(s.orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: "refunded", note: "All items refunded", actorId: input.actorId });
        await db.update(s.payments).set({ status: "refunded" }).where(eq(s.payments.orderId, order.id));
      }
    }
    await notify(order.userId, "refund", "Refund processed", `Rs. ${item.subtotal.toLocaleString()} refunded for ${item.nameSnapshot}.`, `/account?tab=returns`);
  }
  await audit(input.actorId, input.actorName ?? null, `return.${input.action}`, "return", ret.id, { orderId: order.id, note: input.note }, input.ip ?? null);
  const updated = await db.select().from(s.returns).where(eq(s.returns.id, ret.id)).limit(1);
  return updated[0];
}
