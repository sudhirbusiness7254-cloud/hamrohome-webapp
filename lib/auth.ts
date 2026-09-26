import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { users, type userRoleEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canAdminAccessTier } from "@/lib/permissions";

export const SESSION_COOKIE = "bz_session";
const EXPIRY_SECONDS = 7 * 24 * 60 * 60;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "bazzaro-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof userRoleEnum.enumValues)[number];
  adminTier: string | null;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    role: user.role,
    adminTier: user.adminTier,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EXPIRY_SECONDS,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    // Load fresh user record so role/status changes take effect immediately
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        adminTier: users.adminTier,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    const user = rows[0];
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminTier: user.adminTier,
    };
  } catch {
    return null;
  }
}

/** Admin permission tiers — coarse-grained server-side RBAC */
export function canAccess(user: SessionUser | null, area: string): boolean {
  return !!user && user.role === "admin" && canAdminAccessTier(user.adminTier, area);
}
