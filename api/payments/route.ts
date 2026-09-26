import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, fail, parseBody, requireUser, clientIp } from "@/lib/api";
import { getPaymentByTxn, createTransaction, completeSimulatedPayment, PROVIDERS } from "@/lib/payment-providers";

// GET /api/payments?txn= — transaction + order status (owner only)
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const txn = req.nextUrl.searchParams.get("txn");
  if (!txn) return fail("Transaction required", 400, "BAD_REQUEST");
  const found = await getPaymentByTxn(txn);
  if (!found) return fail("Transaction not found", 404, "NOT_FOUND");
  if (found.orderUserId !== auth.user.id && auth.user.role !== "admin") return fail("Transaction not found", 404, "NOT_FOUND");
  return ok({
    txn: found.payment.transactionId,
    provider: found.payment.provider,
    providerName: PROVIDERS[found.payment.provider]?.name ?? found.payment.provider,
    status: found.payment.status,
    amount: found.payment.amount,
    gatewayRef: found.payment.gatewayRef,
    orderId: found.payment.orderId,
    orderNumber: found.orderNumber,
    orderStatus: found.orderStatus,
  });
}

// POST /api/payments {op:'create', orderId, provider} — retry/initiate
// POST /api/payments {op:'complete', txnId, wallet} — wallet gateway pay (server-verified)
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const b = await parseBody<Record<string, unknown>>(req);
  if ("error" in b) return b.error;
  const op = b.value.op as string;

  try {
    if (op === "create") {
      const schema = z.object({ orderId: z.string().uuid(), provider: z.enum(["esewa", "khalti"]) });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Validation failed", 422, "VALIDATION_ERROR", p.error.issues);
      const o = await db.select().from(s.orders).where(and(eq(s.orders.id, p.data.orderId), eq(s.orders.userId, auth.user.id))).limit(1);
      if (!o[0]) return fail("Order not found", 404, "NOT_FOUND");
      if (!["pending_payment", "payment_failed"].includes(o[0].status)) return fail("Order is not awaiting payment", 400, "NOT_PAYABLE");
      await db.update(s.orders).set({ paymentMethod: p.data.provider }).where(eq(s.orders.id, o[0].id));
      const existing = await db.select().from(s.payments).where(and(eq(s.payments.orderId, o[0].id), eq(s.payments.status, "pending"))).limit(1);
      const txn = existing[0]?.provider === p.data.provider ? existing[0] : await createTransaction(o[0].id, p.data.provider, o[0].grandTotal);
      return ok({ txnId: txn.transactionId, redirectUrl: `/payment/return?txn=${txn.transactionId}` }, 201);
    }
    if (op === "complete") {
      const schema = z.object({ txnId: z.string().min(4), wallet: z.string().min(10).max(14) });
      const p = schema.safeParse(b.value);
      if (!p.success) return fail("Enter a valid wallet number", 422, "VALIDATION_ERROR", p.error.issues);
      const found = await getPaymentByTxn(p.data.txnId);
      if (!found || found.orderUserId !== auth.user.id) return fail("Transaction not found", 404, "NOT_FOUND");
      const r = await completeSimulatedPayment(p.data.txnId, p.data.wallet, clientIp(req));
      return ok({ status: r.payment.status, orderId: r.payment.orderId, gatewayRef: r.payment.gatewayRef, already: r.already });
    }
    return fail("Unknown operation", 400, "BAD_REQUEST");
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    return fail(err.message || "Payment failed", err.status || 500, err.code || "PAYMENT_FAILED");
  }
}
