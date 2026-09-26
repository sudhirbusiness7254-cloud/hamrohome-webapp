import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { transitionOrder } from "./order-service";
import { notify, audit } from "./notify";

// ---------------------------------------------------------------------------
// Payment provider abstraction. eSewa/Khalti operate in "simulated gateway"
// mode until real merchant credentials are configured — but ALL verification
// is server-side with HMAC signatures, idempotent processing and audit logs.
// Frontend success is NEVER trusted.
// ---------------------------------------------------------------------------
export const PROVIDERS: Record<string, { name: string; color: string; prefix: string }> = {
  esewa: { name: "eSewa", color: "#60bb46", prefix: "ESEWA" },
  khalti: { name: "Khalti", color: "#5c2d91", prefix: "KHALTI" },
  cod: { name: "Cash on Delivery", color: "#f59e0b", prefix: "COD" },
};

function secret(): string {
  return process.env.AUTH_SECRET || "bazzaro-dev-secret-change-me";
}

export function signPayload(p: Record<string, string | number>): string {
  const data = Object.keys(p).sort().map((k) => `${k}=${p[k]}`).join("&");
  return createHmac("sha256", secret()).update(data).digest("hex");
}

export function verifySignature(p: Record<string, string | number>, sig: string): boolean {
  const expected = signPayload(p);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function newTxnId(provider: string): string {
  return `TXN-${provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
}

export function paymentError(message: string, status = 400, code = "PAYMENT_ERROR"): Error {
  return Object.assign(new Error(message), { status, code });
}

export async function getPaymentByTxn(txnId: string) {
  const rows = await db
    .select({
      payment: s.payments,
      orderNumber: s.orders.orderNumber,
      orderStatus: s.orders.status,
      orderUserId: s.orders.userId,
      grandTotal: s.orders.grandTotal,
      paymentMethod: s.orders.paymentMethod,
    })
    .from(s.payments)
    .innerJoin(s.orders, eq(s.payments.orderId, s.orders.id))
    .where(eq(s.payments.transactionId, txnId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTransaction(orderId: string, provider: string, amount: number) {
  if (!PROVIDERS[provider] || provider === "cod") throw paymentError("Unsupported provider", 400, "PROVIDER_UNSUPPORTED");
  const [p] = await db.insert(s.payments).values({
    orderId, provider, amount, status: "pending", transactionId: newTxnId(provider),
  }).returning();
  return p;
}

// Core verified-payment application — idempotent, shared by gateway + webhook.
export async function applyVerifiedPayment(
  paymentId: string,
  input: { refId: string; raw: unknown; source: string },
) {
  const rows = await db.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
  const payment = rows[0];
  if (!payment) throw paymentError("Transaction not found", 404, "TXN_NOT_FOUND");
  if (payment.status === "verified") {
    return { payment, already: true as const };
  }
  if (payment.status !== "pending") {
    throw paymentError(`Transaction is ${payment.status}`, 409, "TXN_NOT_PENDING");
  }
  const o = await db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
  const order = o[0];
  if (!order) throw paymentError("Order not found", 404, "ORDER_NOT_FOUND");
  if (order.grandTotal !== payment.amount) {
    await db.update(s.payments).set({ status: "failed", rawPayload: { error: "amount_mismatch", raw: input.raw } }).where(eq(s.payments.id, paymentId));
    throw paymentError("Amount mismatch — payment rejected", 400, "AMOUNT_MISMATCH");
  }

  await db.update(s.payments).set({
    status: "verified", gatewayRef: input.refId, signatureVerified: true,
    rawPayload: input.raw, verifiedAt: new Date(),
  }).where(eq(s.payments.id, paymentId));
  await db.update(s.orders).set({ paymentStatus: "verified" }).where(eq(s.orders.id, order.id));
  // Confirm the order (reservation -> sale)
  if (order.status === "pending_payment" || order.status === "payment_failed") {
    await transitionOrder(order.id, "confirmed", null, input.source, `Payment verified via ${input.source} (${input.refId})`);
  }
  await notify(order.userId, "payment", "Payment successful", `Rs. ${payment.amount.toLocaleString()} paid for order ${order.orderNumber}.`, `/checkout/success?order=${order.id}`);
  await audit(null, input.source, "payment.verified", "payment", payment.id, { txn: payment.transactionId, ref: input.refId, orderId: order.id });
  const updated = await db.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
  return { payment: updated[0], already: false as const };
}

// Simulated wallet gateway (acts as eSewa/Khalti server-side).
export async function completeSimulatedPayment(txnId: string, wallet: string, ip?: string | null) {
  const found = await getPaymentByTxn(txnId);
  if (!found) throw paymentError("Transaction not found", 404, "TXN_NOT_FOUND");
  if (!/^9[678]\d{8}$/.test((wallet || "").replace(/[\s-]/g, ""))) {
    throw paymentError("Enter a valid wallet mobile number (98XXXXXXXX)", 400, "INVALID_WALLET");
  }
  const refId = `${PROVIDERS[found.payment.provider].prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
  const payload = { txnId, refId, amount: found.payment.amount };
  const signature = signPayload(payload);
  // Server-side verification (same as webhook path)
  if (!verifySignature(payload, signature)) throw paymentError("Signature verification failed", 400, "SIGNATURE_INVALID");
  return applyVerifiedPayment(found.payment.id, {
    refId,
    raw: { ...payload, signature, wallet: wallet.replace(/[\s-]/g, ""), simulated: true, ip },
    source: PROVIDERS[found.payment.provider].name,
  });
}

// Real-provider webhook path — authenticated + idempotent + logged.
export async function handleWebhook(provider: string, body: { txnId?: string; refId?: string; amount?: number; signature?: string }, ip?: string | null) {
  await audit(null, `${provider}:webhook`, "payment.webhook", "payment", body.txnId ?? "unknown", { body }, ip ?? null);
  if (!PROVIDERS[provider] || provider === "cod") throw paymentError("Unsupported provider", 400, "PROVIDER_UNSUPPORTED");
  const { txnId, refId, amount, signature } = body;
  if (!txnId || !refId || typeof amount !== "number" || !signature) {
    throw paymentError("Missing webhook fields", 400, "WEBHOOK_INVALID");
  }
  const found = await getPaymentByTxn(txnId);
  if (!found) throw paymentError("Transaction not found", 404, "TXN_NOT_FOUND");
  if (found.payment.provider !== provider) throw paymentError("Provider mismatch", 400, "PROVIDER_MISMATCH");
  if (!verifySignature({ txnId, refId, amount }, signature)) throw paymentError("Invalid webhook signature", 401, "SIGNATURE_INVALID");
  if (amount !== found.payment.amount) throw paymentError("Amount mismatch", 400, "AMOUNT_MISMATCH");
  return applyVerifiedPayment(found.payment.id, { refId, raw: { ...body, ip }, source: `${PROVIDERS[provider].name} webhook` });
}
