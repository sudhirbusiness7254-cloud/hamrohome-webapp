import "server-only";
import { db } from "@/db";
import { notifications, auditLogs } from "@/db/schema";

export async function notify(userId: string, type: string, title: string, body?: string, link?: string) {
  try {
    await db.insert(notifications).values({ userId, type, title, body, link });
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

export async function audit(
  actorId: string | null,
  actorName: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  meta?: unknown,
  ip?: string | null,
) {
  try {
    await db.insert(auditLogs).values({
      actorId, actorName, action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      meta: (meta ?? {}) as Record<string, unknown>,
      ip: ip ?? null,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
