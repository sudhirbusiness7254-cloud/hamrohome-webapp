import "server-only";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, lte, gte, sql, inArray } from "drizzle-orm";
import { productCover } from "./media";

type Ex = typeof db;

// ---------------------------------------------------------------------------
// Cart lines with server-side pricing (flash > sale > variant > base)
// ---------------------------------------------------------------------------
export type CartLine = {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  slug: string;
  sku: string;
  color: string | null;
  size: string | null;
  imageColor: string;
  imageUrl: string | null;
  unitPrice: number;
  mrp: number;
  flashDiscount: number | null;
  available: number;
  taxPercent: number;
  vendorId: string;
  shopName: string;
  vendorSlug: string;
  categoryId: string | null;
};

export async function getActiveFlashMap(ex: Ex = db) {
  const now = new Date();
  const rows = await ex
    .select({
      productId: s.flashSaleProducts.productId,
      discountPercent: s.flashSaleProducts.discountPercent,
      stockLimit: s.flashSaleProducts.stockLimit,
      soldCount: s.flashSaleProducts.soldCount,
    })
    .from(s.flashSaleProducts)
    .innerJoin(s.flashSales, eq(s.flashSaleProducts.flashSaleId, s.flashSales.id))
    .where(
      and(
        eq(s.flashSales.isActive, true),
        lte(s.flashSales.startsAt, now),
        gte(s.flashSales.endsAt, now),
      ),
    );
  const map = new Map<string, { discount: number; remaining: number }>();
  for (const r of rows) {
    if (!map.has(r.productId)) {
      map.set(r.productId, {
        discount: r.discountPercent,
        remaining: Math.max(0, r.stockLimit - r.soldCount),
      });
    }
  }
  return map;
}

export async function getCartLines(
  ex: Ex,
  userId?: string | null,
  guestToken?: string | null,
): Promise<{ cartId: string | null; lines: CartLine[] }> {
  let cartId: string | null = null;
  if (userId) {
    const c = await ex.select({ id: s.carts.id }).from(s.carts).where(eq(s.carts.userId, userId)).limit(1);
    cartId = c[0]?.id ?? null;
  } else if (guestToken && guestToken.length >= 8) {
    const c = await ex.select({ id: s.carts.id }).from(s.carts).where(eq(s.carts.guestToken, guestToken)).limit(1);
    cartId = c[0]?.id ?? null;
  }
  if (!cartId) return { cartId: null, lines: [] };

  const items = await ex
    .select({
      cartItemId: s.cartItems.id,
      productId: s.cartItems.productId,
      variantId: s.cartItems.variantId,
      quantity: s.cartItems.quantity,
      name: s.products.name,
      slug: s.products.slug,
      baseSku: s.products.sku,
      price: s.products.price,
      salePrice: s.products.salePrice,
      taxPercent: s.products.taxPercent,
      stock: s.products.stock,
      reserved: s.products.reservedStock,
      status: s.products.status,
      categoryId: s.products.categoryId,
      vendorId: s.products.vendorId,
      shopName: s.vendors.shopName,
      vendorSlug: s.vendors.slug,
      vPrice: s.productVariants.price,
      vStock: s.productVariants.stock,
      vReserved: s.productVariants.reservedStock,
      vColor: s.productVariants.color,
      vSize: s.productVariants.size,
      vSku: s.productVariants.sku,
      vImageColor: s.productVariants.imageColor,
      vActive: s.productVariants.isActive,
      coverUrl: productCover,
    })
    .from(s.cartItems)
    .innerJoin(s.products, eq(s.cartItems.productId, s.products.id))
    .leftJoin(s.productVariants, eq(s.cartItems.variantId, s.productVariants.id))
    .leftJoin(s.vendors, eq(s.products.vendorId, s.vendors.userId))
    .where(eq(s.cartItems.cartId, cartId));

  const flash = await getActiveFlashMap(ex);

  // Fallback colors for products without a selected variant
  const needColor = [...new Set(items.filter((i) => !i.vImageColor).map((i) => i.productId))];
  const colorMap = new Map<string, string>();
  if (needColor.length > 0) {
    const vc = await ex
      .select({ productId: s.productVariants.productId, imageColor: s.productVariants.imageColor })
      .from(s.productVariants)
      .where(inArray(s.productVariants.productId, needColor));
    for (const v of vc) if (!colorMap.has(v.productId) && v.imageColor) colorMap.set(v.productId, v.imageColor);
  }

  const lines: CartLine[] = [];
  for (const i of items) {
    if (i.status !== "approved") continue; // hide unapproved products from cart
    if (i.variantId && i.vActive === false) continue;
    const base = i.vPrice ?? i.salePrice ?? i.price;
    const f = flash.get(i.productId);
    let unit = base;
    let flashDiscount: number | null = null;
    if (f && f.remaining > 0) {
      unit = Math.round((base * (100 - f.discount)) / 100);
      flashDiscount = f.discount;
    }
    let available = i.variantId ? (i.vStock ?? 0) - (i.vReserved ?? 0) : i.stock - i.reserved;
    if (f) available = Math.min(available, f.remaining);
    lines.push({
      cartItemId: i.cartItemId,
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      name: i.name,
      slug: i.slug,
      sku: i.vSku ?? i.baseSku,
      color: i.vColor ?? null,
      size: i.vSize ?? null,
      imageColor: i.vImageColor ?? colorMap.get(i.productId) ?? "#94a3b8",
      imageUrl: i.coverUrl ?? null,
      unitPrice: unit,
      mrp: i.vPrice ?? i.price,
      flashDiscount,
      available: Math.max(0, available),
      taxPercent: Number(i.taxPercent ?? 0),
      vendorId: i.vendorId,
      shopName: i.shopName ?? "Bazzaro",
      vendorSlug: i.vendorSlug ?? "",
      categoryId: i.categoryId,
    });
  }
  return { cartId, lines };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
export type CouponResult = {
  ok: boolean;
  error?: string;
  couponId?: string;
  code?: string;
  discount?: number;
  freeDelivery?: boolean;
};

export async function validateCoupon(
  ex: Ex,
  code: string,
  userId: string | null,
  lines: CartLine[],
  subtotal: number,
): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a coupon code" };
  if (!userId) return { ok: false, error: "Sign in to use coupons" };
  const rows = await ex.select().from(s.coupons).where(eq(s.coupons.code, normalized)).limit(1);
  const c = rows[0];
  if (!c || !c.isActive) return { ok: false, error: "Invalid coupon code" };
  const now = new Date();
  if (c.startsAt > now) return { ok: false, error: "Coupon is not active yet" };
  if (c.endsAt && c.endsAt < now) return { ok: false, error: "Coupon has expired" };
  if (subtotal < c.minOrderAmount) return { ok: false, error: `Minimum order ${c.minOrderAmount} required` };
  if (c.usageLimit) {
    const u = await ex.select({ n: sql<number>`count(*)::int` }).from(s.couponUsages).where(eq(s.couponUsages.couponId, c.id));
    if ((u[0]?.n ?? 0) >= c.usageLimit) return { ok: false, error: "Coupon usage limit reached" };
  }
  const mine = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(s.couponUsages)
    .where(and(eq(s.couponUsages.couponId, c.id), eq(s.couponUsages.userId, userId)));
  if ((mine[0]?.n ?? 0) >= c.perUserLimit) return { ok: false, error: "You have already used this coupon" };
  if (c.firstOrderOnly) {
    const o = await ex.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.userId, userId));
    if ((o[0]?.n ?? 0) > 0) return { ok: false, error: "Valid for first order only" };
  }
  // Scope eligibility
  let eligible = 0;
  for (const l of lines) {
    const lt = l.unitPrice * l.quantity;
    if (c.scope === "all") eligible += lt;
    else if (c.scope === "category" && l.categoryId && (c.categoryIds as string[]).includes(l.categoryId)) eligible += lt;
    else if (c.scope === "product" && (c.productIds as string[]).includes(l.productId)) eligible += lt;
    else if (c.scope === "vendor" && c.vendorId && c.vendorId === l.vendorId) eligible += lt;
  }
  if (eligible <= 0 && !c.freeDelivery) return { ok: false, error: "Coupon not applicable to cart items" };
  let discount = 0;
  if (eligible > 0) {
    discount = c.type === "percent" ? Math.round((eligible * c.value) / 100) : Math.min(c.value, eligible);
    if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  }
  return { ok: true, couponId: c.id, code: c.code, discount, freeDelivery: c.freeDelivery };
}

// ---------------------------------------------------------------------------
// Delivery zones
// ---------------------------------------------------------------------------
export type Zone = typeof s.deliveryZones.$inferSelect;

export async function findZoneForDistrict(ex: Ex, district: string | null | undefined): Promise<Zone | null> {
  const zones = await ex.select().from(s.deliveryZones).where(eq(s.deliveryZones.isActive, true)).orderBy(s.deliveryZones.sortOrder);
  if (zones.length === 0) return null;
  if (district) {
    const d = district.trim().toLowerCase();
    const hit = zones.find((z) => (z.districts as string[]).some((x) => x.trim().toLowerCase() === d));
    if (hit) return hit;
  }
  return zones.find((z) => z.name.toLowerCase().includes("other")) ?? zones[zones.length - 1];
}

export const METHOD_SURCHARGE: Record<string, number> = { standard: 0, express: 80, same_day: 150, pickup: 0 };

export function methodEnabled(zone: Zone | null, method: string): boolean {
  if (!zone) return method === "standard";
  if (method === "standard") return true;
  if (method === "express") return zone.expressEnabled;
  if (method === "same_day") return zone.sameDayEnabled;
  if (method === "pickup") return zone.pickupEnabled;
  return false;
}

export function deliveryFeeFor(zone: Zone | null, method: string, netSubtotal: number, freeShip: boolean): number {
  if (method === "pickup") return 0;
  if (!zone) return 0;
  if (freeShip) return 0;
  if (zone.freeThreshold > 0 && netSubtotal >= zone.freeThreshold) return 0;
  return zone.fee + (METHOD_SURCHARGE[method] ?? 0);
}

// ---------------------------------------------------------------------------
// Full totals
// ---------------------------------------------------------------------------
export type Totals = {
  cartId: string | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  grandTotal: number;
  coupon: { id: string; code: string; discount: number; freeDelivery: boolean } | null;
  couponError: string | null;
  zone: Zone | null;
  method: string;
};

export async function computeTotals(
  ex: Ex,
  opts: {
    userId?: string | null;
    guestToken?: string | null;
    couponCode?: string | null;
    zoneId?: string | null;
    district?: string | null;
    method?: string | null;
  },
): Promise<Totals> {
  const { cartId, lines } = await getCartLines(ex, opts.userId ?? null, opts.guestToken ?? null);
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  const count = lines.reduce((a, l) => a + l.quantity, 0);

  let coupon: Totals["coupon"] = null;
  let couponError: string | null = null;
  if (opts.couponCode) {
    const r = await validateCoupon(ex, opts.couponCode, opts.userId ?? null, lines, subtotal);
    if (r.ok) coupon = { id: r.couponId!, code: r.code!, discount: r.discount!, freeDelivery: !!r.freeDelivery };
    else couponError = r.error!;
  }
  const discount = coupon?.discount ?? 0;

  let zone: Zone | null = null;
  if (opts.zoneId) {
    const z = await ex.select().from(s.deliveryZones).where(eq(s.deliveryZones.id, opts.zoneId)).limit(1);
    zone = z[0] ?? null;
  }
  if (!zone) zone = await findZoneForDistrict(ex, opts.district ?? null);

  let method = opts.method || "standard";
  if (!methodEnabled(zone, method)) method = "standard";

  const tax = lines.reduce((a, l) => a + Math.round(((l.unitPrice * l.quantity * l.taxPercent) / 100)), 0);
  const deliveryFee = lines.length === 0 ? 0 : deliveryFeeFor(zone, method, subtotal - discount, !!coupon?.freeDelivery);
  const grandTotal = Math.max(0, subtotal - discount + tax + deliveryFee);

  return { cartId, lines, count, subtotal, discount, tax, deliveryFee, grandTotal, coupon, couponError, zone, method };
}
