import { isSafeHostedCheckoutUrl, paymentIntentExpiry } from '@/lib/payments/gateway';

export async function createHostedPaymentIntent(input: {
  amount: number;
  currency: string;
  idempotencyKey: string;
  reference: string;
  returnUrl: string;
}) {
  const endpoint = process.env.PAYMENT_GATEWAY_ENDPOINT;
  const apiKey = process.env.PAYMENT_GATEWAY_API_KEY;
  if (!endpoint || !apiKey) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      merchantReference: input.reference,
      returnUrl: input.returnUrl,
      captureMethod: 'automatic',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { id?: unknown; checkoutUrl?: unknown };
  if (
    typeof payload.id !== 'string' ||
    typeof payload.checkoutUrl !== 'string' ||
    !isSafeHostedCheckoutUrl(payload.checkoutUrl)
  )
    throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  return {
    providerRef: payload.id.slice(0, 200),
    checkoutUrl: payload.checkoutUrl,
    expiresAt: paymentIntentExpiry(),
  };
}

export async function dispatchProviderRefund(input: {
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerPaymentRef: string;
  reason: string;
}) {
  const endpoint = process.env.PAYMENT_GATEWAY_REFUND_ENDPOINT;
  const apiKey = process.env.PAYMENT_GATEWAY_API_KEY;
  if (!endpoint || !apiKey) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      paymentReference: input.providerPaymentRef,
      reason: input.reason,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_REFUND_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { id?: unknown; status?: unknown };
  if (typeof payload.id !== 'string' || typeof payload.status !== 'string')
    throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  return { providerRefundRef: payload.id.slice(0, 200), status: payload.status.slice(0, 50) };
}
