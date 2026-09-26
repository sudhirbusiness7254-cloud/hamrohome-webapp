import { NextRequest } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ok, fail, parseBody, requireUser } from "@/lib/api";

// GET /api/notifications — list + unread count
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const limit = 20;
  const [items, unread] = await Promise.all([
    db.select().from(s.notifications).where(eq(s.notifications.userId, auth.user.id)).orderBy(desc(s.notifications.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ n: sql<number>`count(*)::int` }).from(s.notifications).where(and(eq(s.notifications.userId, auth.user.id), eq(s.notifications.isRead, false))),
  ]);
  return ok({ items, unread: unread[0]?.n ?? 0, page });
}

// POST /api/notifications {id?|all?} — mark read
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<{ id?: string; all?: boolean }>(req);
  if ("error" in b) return b.error;
  if (b.value.all) {
    await db.update(s.notifications).set({ isRead: true }).where(eq(s.notifications.userId, auth.user.id));
  } else if (b.value.id) {
    await db.update(s.notifications).set({ isRead: true }).where(and(eq(s.notifications.id, b.value.id), eq(s.notifications.userId, auth.user.id)));
  } else {
    return fail("Nothing to update", 400, "BAD_REQUEST");
  }
  return ok({ done: true });
}
