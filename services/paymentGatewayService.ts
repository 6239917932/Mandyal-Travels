import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import {
  isCompletedProviderRefundStatus,
  isSafeHostedCheckoutUrl,
  paymentIntentExpiry,
} from '@/lib/payments/gateway';
import {
  parsePayuVerifiedTransaction,
  payuCommandHash,
  type PayuVerifiedTransaction,
} from '@/lib/payments/payu';
import {
  isRazorpayOrderId,
  isRazorpayPaymentId,
  isRazorpayRefundId,
  rupeesToPaise,
} from '@/lib/payments/razorpay';
import {
  assertPaymentProviderCapability,
  selectedPaymentProvider,
} from '@/lib/payments/providerSelection';

function paymentProviderConfiguration(endpoint: string | undefined) {
  const allowedHosts = parseAllowedProviderHosts(process.env.PAYMENT_PROVIDER_ALLOWED_HOSTS);
  if (!endpoint || !isAllowedProviderEndpoint(endpoint, allowedHosts)) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return { allowedHosts, endpoint };
}

function requiredLegacyPayuValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /replace|example|change-me/i.test(value)) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return value;
}

function requiredRazorpayValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /replace|example|change-me/i.test(value)) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return value;
}

function razorpayHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${requiredRazorpayValue('RAZORPAY_KEY_ID')}:${requiredRazorpayValue('RAZORPAY_KEY_SECRET')}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
}

async function razorpayRequest(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { ...razorpayHeaders(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  return response.json() as Promise<Record<string, unknown>>;
}

async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  description?: string;
  idempotencyKey: string;
  reference: string;
  returnUrl: string;
  transfer?: { account: string; amount: number };
}) {
  if (process.env.RAZORPAY_INTEGRATION_ENABLED !== 'true') {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  if (
    input.transfer &&
    (process.env.RAZORPAY_ROUTE_ENABLED !== 'true' ||
      !process.env.RAZORPAY_ROUTE_APPROVAL_REFERENCE?.trim())
  ) {
    throw new Error('RAZORPAY_ROUTE_NOT_APPROVED');
  }
  if (!Number.isSafeInteger(input.amount) || input.amount < 1 || input.currency !== 'INR') {
    throw new Error('PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT');
  }
  const amount = rupeesToPaise(input.amount);
  const transfers = input.transfer
    ? [
        {
          account: input.transfer.account,
          amount: rupeesToPaise(input.transfer.amount),
          currency: 'INR',
          on_hold: true,
        },
      ]
    : undefined;
  const payload = await razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      currency: 'INR',
      partial_payment: false,
      receipt: input.idempotencyKey.slice(0, 40),
      notes: { reference: input.reference.slice(0, 100) },
      ...(transfers ? { transfers } : {}),
    }),
  });
  if (!isRazorpayOrderId(payload.id) || payload.amount !== amount || payload.currency !== 'INR') {
    throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  }
  const origin = new URL(input.returnUrl).origin;
  return {
    providerRef: payload.id,
    checkoutUrl: `${origin}/payments/razorpay/${encodeURIComponent(payload.id)}`,
    expiresAt: paymentIntentExpiry(),
  };
}

export async function fetchRazorpayPayment(paymentId: string) {
  if (!isRazorpayPaymentId(paymentId)) throw new Error('PAYMENT_PROVIDER_INVALID_REFERENCE');
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

// Historical PayU intents retain a read-only reconciliation path. New checkout cannot select PayU.
export async function verifyPayuTransaction(
  transactionId: string,
): Promise<PayuVerifiedTransaction> {
  const key = requiredLegacyPayuValue('PAYU_MERCHANT_KEY');
  const salt = requiredLegacyPayuValue('PAYU_MERCHANT_SALT');
  const command = 'verify_payment';
  const endpoint = paymentProviderConfiguration(
    requiredLegacyPayuValue('PAYU_COMMAND_ENDPOINT'),
  ).endpoint;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      command,
      hash: payuCommandHash({ command, key, salt, variable: transactionId }),
      key,
      var1: transactionId,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  const parsed = parsePayuVerifiedTransaction(transactionId, await response.json());
  if (!parsed) throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  return parsed;
}

export async function createHostedPaymentIntent(input: {
  amount: number;
  callbackPath?: string;
  currency: string;
  description?: string;
  idempotencyKey: string;
  reference: string;
  returnUrl: string;
  transfer?: { account: string; amount: number };
}) {
  const provider = selectedPaymentProvider(process.env.PAYMENT_PROVIDER_ID);
  assertPaymentProviderCapability(provider, 'hostedCheckout');
  if (provider === 'razorpay') return createRazorpayOrder(input);
  const apiKey = process.env.PAYMENT_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  const { allowedHosts, endpoint } = paymentProviderConfiguration(
    process.env.PAYMENT_GATEWAY_ENDPOINT,
  );
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
    !isSafeHostedCheckoutUrl(payload.checkoutUrl, allowedHosts)
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
  const provider = selectedPaymentProvider(process.env.PAYMENT_PROVIDER_ID);
  assertPaymentProviderCapability(provider, 'refunds');
  if (provider === 'razorpay') {
    if (input.currency !== 'INR' || !isRazorpayPaymentId(input.providerPaymentRef)) {
      throw new Error('PAYMENT_PROVIDER_INVALID_REFERENCE');
    }
    const payload = await razorpayRequest(
      `/payments/${encodeURIComponent(input.providerPaymentRef)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: rupeesToPaise(input.amount),
          notes: {
            reason: input.reason.slice(0, 200),
            request: input.idempotencyKey.slice(0, 100),
          },
        }),
      },
    );
    if (!isRazorpayRefundId(payload.id) || payload.status !== 'processed') {
      throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
    }
    return { providerRefundRef: payload.id, status: String(payload.status).toUpperCase() };
  }
  const apiKey = process.env.PAYMENT_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  const { endpoint } = paymentProviderConfiguration(process.env.PAYMENT_GATEWAY_REFUND_ENDPOINT);
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
  const status = payload.status.trim().toUpperCase().slice(0, 50);
  if (!isCompletedProviderRefundStatus(status)) {
    throw new Error('PAYMENT_REFUND_NOT_COMPLETED');
  }
  return { providerRefundRef: payload.id.slice(0, 200), status };
}
