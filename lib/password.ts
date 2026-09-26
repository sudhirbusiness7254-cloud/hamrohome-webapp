import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// scrypt password hashing — no native dependencies, constant-time compare.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

export function isStrongPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}
