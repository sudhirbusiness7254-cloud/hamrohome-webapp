import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { notify, audit } from "@/lib/notify";

const CATS = ["payment", "order", "delivery", "return", "refund", "product", "account", "other"];

// GET /api/support[?status=] | ?id= — detail with messages
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const q = req.nextUrl.searchParams;
  const id = q.get("id");
  const isAdmin = auth.user.role === "admin";

  if (id) {
    const t = await db.select().from(s.supportTickets).where(eq(s.supportTickets.id, id)).limit(1);
    if (!t[0]) return fail("Ticket not found", 404, "NOT_FOUND");
    if (!isAdmin && t[0].userId !== auth.user.id) return fail("Ticket not found", 404, "NOT_FOUND");
    const msgs = await db.select({ msg: s.supportMessages, senderName: s.users.name })
      .from(s.supportMessages)
      .leftJoin(s.users, eq(s.supportMessages.senderId, s.users.id))
      .where(eq(s.supportMessages.ticketId, id))
      .orderBy(s.supportMessages.createdAt);
    const owner = await db.select({ name: s.users.name, email: s.users.email }).from(s.users).where(eq(s.users.id, t[0].userId)).limit(1);
    return ok({ ticket: t[0], messages: msgs, owner: owner[0] ?? null });
  }

  const status = q.get("status");
  const rows = isAdmin
    ? await db.select({ ticket: s.supportTickets, userName: s.users.name, userEmail: s.users.email })
      .from(s.supportTickets)
      .innerJoin(s.users, eq(s.supportTickets.userId, s.users.id))
      .orderBy(desc(s.supportTickets.updatedAt))
      .limit(100)
    : await db.select().from(s.supportTickets).where(eq(s.supportTickets.userId, auth.user.id)).orderBy(desc(s.supportTickets.updatedAt)).limit(100);
  const list = (rows as unknown[]).filter((r) => {
    if (!status) return true;
    const t = (r as { ticket?: typeof s.supportTickets.$inferSelect }).ticket ?? (r as typeof s.supportTickets.$inferSelect);
    return t.status === status;
  });
  void sql;
  return ok({ tickets: list });
}

// POST /api/support {subject, category, orderId?, message} | {op:'message', id, body}
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;

  if (b.value.op === "message") {
    const schema = z.object({ id: z.string().uuid(), body: z.string().min(1).max(3000) });
    const p = schema.safeParse(b.value);
    if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
    const t = await db.select().from(s.supportTickets).where(eq(s.supportTickets.id, p.data.id)).limit(1);
    if (!t[0]) return fail("Ticket not found", 404, "NOT_FOUND");
    const isAdmin = auth.user.role === "admin";
    if (!isAdmin && t[0].userId !== auth.user.id) return fail("Ticket not found", 404, "NOT_FOUND");
    const [m] = await db.insert(s.supportMessages).values({ ticketId: p.data.id, senderId: auth.user.id, isStaff: isAdmin, body: p.data.body }).returning();
    const nextStatus = isAdmin ? "waiting_for_customer" : t[0].status === "waiting_for_customer" ? "in_progress" : t[0].status;
    await db.update(s.supportTickets).set({ status: nextStatus as typeof s.supportTickets.$inferSelect.status, updatedAt: new Date() }).where(eq(s.supportTickets.id, p.data.id));
    if (isAdmin) await notify(t[0].userId, "support", `Support replied: ${t[0].subject}`, p.data.body.slice(0, 140), `/account?tab=support&ticket=${t[0].id}`);
    else {
      const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
      for (const a of admins) await notify(a.id, "support", `New reply on ${t[0].ticketNumber}`, `${auth.user.name}: ${p.data.body.slice(0, 120)}`, `/admin?tab=support`);
    }
    return ok({ message: m }, 201);
  }

  const schema = z.object({
    subject: z.string().min(4).max(160),
    category: z.enum(CATS as [string, ...string[]]),
    orderId: z.string().uuid().nullable().optional(),
    message: z.string().min(4).max(3000),
  });
  const p = schema.safeParse(b.value);
  if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
  const num = `TK-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
  const [t] = await db.insert(s.supportTickets).values({
    ticketNumber: num, userId: auth.user.id, orderId: p.data.orderId ?? null,
    category: p.data.category, subject: p.data.subject, status: "open",
  }).returning();
  await db.insert(s.supportMessages).values({ ticketId: t.id, senderId: auth.user.id, isStaff: false, body: p.data.message });
  const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
  for (const a of admins) await notify(a.id, "support", `New ticket ${num}`, `${p.data.subject} — ${auth.user.name}`, `/admin?tab=support`);
  await audit(auth.user.id, auth.user.name, "support.create", "ticket", t.id, { num }, clientIp(req));
  return ok({ ticket: t }, 201);
}

// PATCH /api/support {id, status} — admin
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "admin") return fail("Forbidden", 403, "FORBIDDEN");
  const b = await parseBody<{ id?: string; status?: string }>(req);
  if ("error" in b) return b.error;
  if (!b.value.id || !["open", "in_progress", "waiting_for_customer", "resolved", "closed"].includes(b.value.status || "")) {
    return fail("Invalid status", 400, "BAD_REQUEST");
  }
  await db.update(s.supportTickets).set({ status: b.value.status as typeof s.supportTickets.$inferSelect.status, updatedAt: new Date() }).where(eq(s.supportTickets.id, b.value.id));
  return ok({ done: true });
}
