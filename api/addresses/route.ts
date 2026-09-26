import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ok, fail, parseBody, requireUser } from "@/lib/api";

const schema = z.object({
  label: z.string().min(1).max(30).optional(),
  recipient: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  province: z.string().min(2).max(60),
  district: z.string().min(2).max(60),
  city: z.string().min(2).max(80),
  ward: z.string().max(10).nullable().optional(),
  street: z.string().min(3).max(200),
  landmark: z.string().max(200).nullable().optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/addresses
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const rows = await db.select().from(s.addresses).where(eq(s.addresses.userId, auth.user.id)).orderBy(desc(s.addresses.isDefault), desc(s.addresses.label));
  return ok({ addresses: rows });
}

// POST /api/addresses
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody(req);
  if ("error" in b) return b.error;
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  const existing = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, auth.user.id));
  const isDefault = p.data.isDefault ?? existing.length === 0;
  if (isDefault) await db.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, auth.user.id));
  const [a] = await db.insert(s.addresses).values({
    userId: auth.user.id, label: p.data.label || "Home", recipient: p.data.recipient.trim(),
    phone: p.data.phone.trim(), province: p.data.province.trim(), district: p.data.district.trim(),
    city: p.data.city.trim(), ward: p.data.ward || null, street: p.data.street.trim(),
    landmark: p.data.landmark || null, isDefault,
  }).returning();
  return ok({ address: a }, 201);
}

// PATCH /api/addresses {id, ...fields}
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const id = b.value.id as string;
  if (!id) return fail("Address required", 400, "BAD_REQUEST");
  const p = schema.partial().safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  const rows = await db.select().from(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, auth.user.id))).limit(1);
  if (!rows[0]) return fail("Address not found", 404, "NOT_FOUND");
  if (p.data.isDefault) await db.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, auth.user.id));
  const patch: Partial<typeof s.addresses.$inferInsert> = {};
  for (const k of ["label", "recipient", "phone", "province", "district", "city", "ward", "street", "landmark"] as const) {
    if (p.data[k] !== undefined) (patch as Record<string, unknown>)[k] = p.data[k];
  }
  if (p.data.isDefault !== undefined) patch.isDefault = p.data.isDefault;
  const [u] = await db.update(s.addresses).set(patch).where(eq(s.addresses.id, id)).returning();
  return ok({ address: u });
}

// DELETE /api/addresses?id=
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("Address required", 400, "BAD_REQUEST");
  const rows = await db.select().from(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, auth.user.id))).limit(1);
  if (!rows[0]) return fail("Address not found", 404, "NOT_FOUND");
  await db.delete(s.addresses).where(eq(s.addresses.id, id));
  if (rows[0].isDefault) {
    const rest = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, auth.user.id)).limit(1);
    if (rest[0]) await db.update(s.addresses).set({ isDefault: true }).where(eq(s.addresses.id, rest[0].id));
  }
  return ok({ done: true });
}
