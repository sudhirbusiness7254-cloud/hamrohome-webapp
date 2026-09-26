import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Consistent API envelope: { success, data | message, code, errors }
// ---------------------------------------------------------------------------
export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ success: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, code = "BAD_REQUEST", errors: unknown[] = []) {
  return NextResponse.json({ success: false, message, code, errors }, { status });
}

export async function parseBody<T>(req: Request): Promise<{ value: T } | { error: NextResponse }> {
  try {
    const value = (await req.json()) as T;
    return { value };
  } catch {
    return { error: fail("Invalid JSON body", 400, "INVALID_JSON") };
  }
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: fail(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      ),
    };
  }
  return { value: parsed.data };
}

export async function requireUser(): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: fail("Authentication required", 401, "UNAUTHENTICATED") };
  return { user };
}

export async function requireRole(...roles: SessionUser["role"][]) {
  const user = await getSessionUser();
  if (!user) return { response: fail("Authentication required", 401, "UNAUTHENTICATED") };
  if (!roles.includes(user.role)) {
    return { response: fail("You do not have permission to perform this action", 403, "FORBIDDEN") };
  }
  return { user };
}

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || `req_${Math.random().toString(36).slice(2, 10)}`;
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
