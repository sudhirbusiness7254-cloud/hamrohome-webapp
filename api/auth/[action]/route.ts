import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { createSession, clearSession, getSessionUser } from "@/lib/auth";
import { hashPassword, verifyPassword, isStrongPassword } from "@/lib/password";
import { audit } from "@/lib/notify";

const AVATARS = ["#f59e0b", "#0ea5e9", "#22c55e", "#ec4899", "#6366f1", "#d946ef", "#10b981"];

async function mergeGuestCart(userId: string, guestToken: string | null) {
  if (!guestToken || guestToken.length < 8) return;
  const guest = await db.select().from(s.carts).where(eq(s.carts.guestToken, guestToken)).limit(1);
  if (!guest[0]) return;
  const mine = await db.select().from(s.carts).where(eq(s.carts.userId, userId)).limit(1);
  if (!mine[0]) {
    await db.update(s.carts).set({ userId, guestToken: null }).where(eq(s.carts.id, guest[0].id));
    return;
  }
  const gItems = await db.select().from(s.cartItems).where(eq(s.cartItems.cartId, guest[0].id));
  const mItems = await db.select().from(s.cartItems).where(eq(s.cartItems.cartId, mine[0].id));
  for (const gi of gItems) {
    const dup = mItems.find((m) => m.productId === gi.productId && (m.variantId ?? null) === (gi.variantId ?? null));
    if (dup) {
      await db.update(s.cartItems).set({ quantity: dup.quantity + gi.quantity }).where(eq(s.cartItems.id, dup.id));
      await db.delete(s.cartItems).where(eq(s.cartItems.id, gi.id));
    } else {
      await db.update(s.cartItems).set({ cartId: mine[0].id }).where(eq(s.cartItems.id, gi.id));
    }
  }
  await db.delete(s.carts).where(eq(s.carts.id, guest[0].id));
}

function toUser(u: typeof s.users.$inferSelect) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, adminTier: u.adminTier, avatarColor: u.avatarColor };
}

type Ctx = { params: Promise<{ action: string }> };

// POST /api/auth/register | /login | /logout
export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;

  if (action === "register") {
    const schema = z.object({
      name: z.string().min(2).max(80),
      email: z.string().email().max(160),
      password: z.string().min(8).max(100),
      phone: z.string().max(20).optional(),
    });
    const b = await parseBody(req);
    if ("error" in b) return b.error;
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (!isStrongPassword(p.data.password)) return fail("Password must be 8+ characters with letters and numbers", 422, "WEAK_PASSWORD");
    const email = p.data.email.toLowerCase().trim();
    const exists = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email)).limit(1);
    if (exists[0]) return fail("An account with this email already exists", 409, "EMAIL_TAKEN");
    const [user] = await db.insert(s.users).values({
      name: p.data.name.trim(), email, phone: p.data.phone?.trim() || null,
      passwordHash: hashPassword(p.data.password), role: "customer",
      avatarColor: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      emailVerifiedAt: new Date(),
    }).returning();
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, adminTier: user.adminTier });
    await mergeGuestCart(user.id, req.headers.get("x-guest-token"));
    await audit(user.id, user.name, "auth.register", "user", user.id, { email }, clientIp(req));
    return ok({ user: toUser(user) }, 201);
  }

  if (action === "login") {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const b = await parseBody(req);
    if ("error" in b) return b.error;
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Invalid email or password", 401, "INVALID_CREDENTIALS");
    const rows = await db.select().from(s.users).where(eq(s.users.email, p.data.email.toLowerCase().trim())).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(p.data.password, user.passwordHash)) {
      return fail("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, adminTier: user.adminTier });
    await mergeGuestCart(user.id, req.headers.get("x-guest-token"));
    await audit(user.id, user.name, "auth.login", "user", user.id, {}, clientIp(req));
    return ok({ user: toUser(user) });
  }

  if (action === "logout") {
    await clearSession();
    return ok({ done: true });
  }

  return fail("Not found", 404, "NOT_FOUND");
}

// GET /api/auth/me
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action !== "me") return fail("Not found", 404, "NOT_FOUND");
  const session = await getSessionUser();
  if (!session) return fail("Not signed in", 401, "UNAUTHENTICATED");
  const rows = await db.select().from(s.users).where(eq(s.users.id, session.id)).limit(1);
  if (!rows[0]) return fail("Not signed in", 401, "UNAUTHENTICATED");
  return ok({ user: toUser(rows[0]) });
}

// PATCH /api/auth/me | /password
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (action === "me") {
    const schema = z.object({ name: z.string().min(2).max(80).optional(), phone: z.string().max(20).nullable().optional() });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const patch: Partial<typeof s.users.$inferInsert> = { updatedAt: new Date() };
    if (p.data.name !== undefined) patch.name = p.data.name.trim();
    if (p.data.phone !== undefined) patch.phone = p.data.phone?.trim() || null;
    const [u] = await db.update(s.users).set(patch).where(eq(s.users.id, auth.user.id)).returning();
    return ok({ user: toUser(u) });
  }
  if (action === "password") {
    const schema = z.object({ current: z.string().min(1), next: z.string().min(8).max(100) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    if (!isStrongPassword(p.data.next)) return fail("New password must be 8+ characters with letters and numbers", 422, "WEAK_PASSWORD");
    const rows = await db.select().from(s.users).where(eq(s.users.id, auth.user.id)).limit(1);
    if (!verifyPassword(p.data.current, rows[0].passwordHash)) return fail("Current password is incorrect", 400, "WRONG_PASSWORD");
    await db.update(s.users).set({ passwordHash: hashPassword(p.data.next), passwordChangedAt: new Date() }).where(eq(s.users.id, auth.user.id));
    await audit(auth.user.id, auth.user.name, "auth.password_change", "user", auth.user.id, {}, clientIp(req));
    return ok({ done: true });
  }
  return fail("Not found", 404, "NOT_FOUND");
}
