"use client";

// Typed fetch wrapper for the Bazzaro API envelope.
// Sends the guest token so anonymous carts work, and cookies for sessions.
export function guestToken(): string {
  if (typeof window === "undefined") return "";
  let t = "";
  try {
    t = localStorage.getItem("bz_guest") || "";
    if (!t) {
      t = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `g-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("bz_guest", t);
    }
  } catch { /* ignore */ }
  return t;
}

export type ApiError = Error & { code?: string; status?: number; errors?: unknown[] };

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", "x-guest-token": guestToken() },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({ success: false, message: "Network error. Please try again." }));
  if (!json.success) {
    const e = new Error(json.message || "Request failed") as ApiError;
    e.code = json.code;
    e.status = res.status;
    e.errors = json.errors;
    throw e;
  }
  return json.data as T;
}

export function errMsg(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}
