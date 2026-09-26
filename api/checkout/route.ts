import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { computeTotals, findZoneForDistrict } from "@/lib/pricing";
import { createOrder } from "@/lib/order-service";

// GET /api/checkout?addressId=&zoneId=&method=&coupon= — addresses + zones + live totals
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const q = req.nextUrl.searchParams;
  const addressId = q.get("addressId");
  const addresses = await db.select().from(s.addresses).where(eq(s.addresses.userId, auth.user.id)).orderBy(desc(s.addresses.isDefault));
  const zones = await db.select().from(s.deliveryZones).where(eq(s.deliveryZones.isActive, true)).orderBy(s.deliveryZones.sortOrder);

  let district: string | null = null;
  if (addressId) {
    const a = addresses.find((x) => x.id === addressId);
    district = a?.district ?? null;
  } else if (addresses[0]) {
    district = addresses.find((x) => x.isDefault)?.district ?? addresses[0].district;
  }
  const t = await computeTotals(db, {
    userId: auth.user.id, couponCode: q.get("coupon"),
    zoneId: q.get("zoneId"), district, method: q.get("method"),
  });
  const zone = t.zone ?? (await findZoneForDistrict(db, district));
  return ok({ addresses, zones, summary: { ...t, zone } });
}

// POST /api/checkout {addressId, zoneId?, method?, paymentMethod, couponCode?, note?}
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const schema = z.object({
    addressId: z.string().uuid(),
    zoneId: z.string().uuid().nullable().optional(),
    method: z.enum(["standard", "express", "same_day", "pickup"]).optional(),
    paymentMethod: z.enum(["cod", "esewa", "khalti"]),
    couponCode: z.string().max(32).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  });
  const b = await parseBody(req);
  if ("error" in b) return b.error;
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  try {
    const result = await createOrder({
      userId: auth.user.id, addressId: p.data.addressId,
      zoneId: p.data.zoneId ?? null, method: p.data.method ?? "standard",
      paymentMethod: p.data.paymentMethod, couponCode: p.data.couponCode ?? null,
      note: p.data.note ?? null, ip: clientIp(req),
    });
    return ok(result, 201);
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    return fail(err.message || "Checkout failed", err.status || 500, err.code || "CHECKOUT_FAILED");
  }
}
