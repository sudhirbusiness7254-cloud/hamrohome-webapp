import { NextRequest, NextResponse } from "next/server";
import { ok, fail, clientIp } from "@/lib/api";
import { handleWebhook } from "@/lib/payment-providers";

// POST /api/webhooks/esewa | /khalti — gateway callbacks (signature-verified, idempotent)
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  let body: { txnId?: string; refId?: string; amount?: number; signature?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400, "INVALID_JSON");
  }
  try {
    const r = await handleWebhook(provider, body, clientIp(req));
    return ok({ received: true, already: r.already, status: r.payment.status });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    // Always acknowledge receipt shape, but with error envelope
    return NextResponse.json({ success: false, message: err.message, code: err.code || "WEBHOOK_FAILED" }, { status: err.status || 500 });
  }
}

export async function GET() {
  return fail("Method not allowed", 405, "METHOD_NOT_ALLOWED");
}
