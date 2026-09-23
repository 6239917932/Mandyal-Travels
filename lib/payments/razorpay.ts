import { createHmac, timingSafeEqual } from 'node:crypto';

const ORDER_PATTERN = /^order_[A-Za-z0-9]{8,80}$/;
const PAYMENT_PATTERN = /^pay_[A-Za-z0-9]{8,80}$/;
const REFUND_PATTERN = /^rfnd_[A-Za-z0-9]{8,80}$/;
const ACCOUNT_PATTERN = /^acc_[A-Za-z0-9]{8,80}$/;

function safeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function isRazorpayOrderId(value: unknown): value is string {
  return typeof value === 'string' && ORDER_PATTERN.test(value);
}

export function isRazorpayPaymentId(value: unknown): value is string {
  return typeof value === 'string' && PAYMENT_PATTERN.test(value);
}

export function isRazorpayRefundId(value: unknown): value is string {
  return typeof value === 'string' && REFUND_PATTERN.test(value);
}

export function isRazorpayLinkedAccountId(value: unknown): value is string {
  return typeof value === 'string' && ACCOUNT_PATTERN.test(value);
}

export function verifyRazorpayCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  if (!isRazorpayOrderId(input.orderId) || !isRazorpayPaymentId(input.paymentId)) return false;
  const expected = createHmac('sha256', input.secret)
    .update(`${input.orderId}|${input.paymentId}`, 'utf8')
    .digest('hex');
  return safeHexEqual(expected, input.signature);
}

export function verifyRazorpayWebhookSignature(input: {
  payload: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac('sha256', input.secret).update(input.payload, 'utf8').digest('hex');
  return safeHexEqual(expected, input.signature);
}

export function rupeesToPaise(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 1)
    throw new Error('PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT');
  const paise = amount * 100;
  if (!Number.isSafeInteger(paise)) throw new Error('PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT');
  return paise;
}
