import { createHash, timingSafeEqual } from 'node:crypto';

export type PaymentOrder = { orderId: string; amount: number; currency: 'NPR'; returnUrl: string; callbackUrl: string };
export type PaymentIntent = { provider: string; providerReference: string; redirectUrl?: string; payload?: Record<string, string> };
export type PaymentVerification = { verified: boolean; providerReference?: string; amount?: number; raw?: unknown };

/**
 * All gateways implement the same server-side contract. A frontend redirect
 * is never enough to mark an order paid; the application must call verify or
 * accept an authenticated, idempotent webhook first.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(order: PaymentOrder): Promise<PaymentIntent>;
  verifyPayment(reference: string, expected: PaymentOrder): Promise<PaymentVerification>;
  handleWebhook(headers: Headers, body: string): Promise<PaymentVerification>;
  refundPayment(reference: string, amount: number): Promise<{ accepted: boolean; reference?: string }>;
  getPaymentStatus(reference: string): Promise<PaymentVerification>;
}

export class CashOnDeliveryProvider implements PaymentProvider {
  readonly name = 'COD';
  async createPayment(order: PaymentOrder) { return { provider: this.name, providerReference: `COD-${order.orderId}` }; }
  async verifyPayment() { return { verified: true } as PaymentVerification; }
  async handleWebhook() { return { verified: false } as PaymentVerification; }
  async refundPayment() { return { accepted: false }; }
  async getPaymentStatus() { return { verified: false } as PaymentVerification; }
}

export function verifyHmacSignature(payload: string, signature: string, secret: string) {
  const expected = createHash('sha256').update(`${payload}:${secret}`).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}
