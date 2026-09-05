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
  payuTransactionId,
  type PayuVerifiedTransaction,
} from '@/lib/payments/payu';

let cachedPayuToken: { expiresAt: number; value: string } | undefined;

function paymentProviderConfiguration(endpoint: string | undefined) {
  const allowedHosts = parseAllowedProviderHosts(process.env.PAYMENT_PROVIDER_ALLOWED_HOSTS);
  if (!endpoint || !isAllowedProviderEndpoint(endpoint, allowedHosts)) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return { allowedHosts, endpoint };
}

function requiredPayuValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /replace|example|change-me/i.test(value)) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return value;
}

function payuEndpoint(name: string): string {
  return paymentProviderConfiguration(requiredPayuValue(name)).endpoint;
}

async function payuAccessToken(): Promise<string> {
  if (cachedPayuToken && cachedPayuToken.expiresAt > Date.now() + 60_000) {
    return cachedPayuToken.value;
  }
  const response = await fetch(payuEndpoint('PAYU_OAUTH_ENDPOINT'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredPayuValue('PAYU_CLIENT_ID'),
      client_secret: requiredPayuValue('PAYU_CLIENT_SECRET'),
      grant_type: 'client_credentials',
      scope: 'create_payment_links',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof payload.access_token !== 'string' || payload.access_token.length < 20) {
    throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  }
  const expiresIn = Number(payload.expires_in);
  cachedPayuToken = {
    value: payload.access_token,
    expiresAt:
      Date.now() + (Number.isFinite(expiresIn) && expiresIn > 60 ? expiresIn : 300) * 1_000,
  };
  return cachedPayuToken.value;
}

async function createPayuPaymentLink(input: {
  amount: number;
  callbackPath?: string;
  currency: string;
  description?: string;
  idempotencyKey: string;
  reference: string;
  returnUrl: string;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount < 1 || input.currency !== 'INR') {
    throw new Error('PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT');
  }
  const providerRef = payuTransactionId(input.idempotencyKey);
  const returnOrigin = new URL(input.returnUrl).origin;
  const callback = new URL(input.callbackPath ?? '/api/v1/payments/payu/return', returnOrigin);
  callback.searchParams.set('txnid', providerRef);
  const token = await payuAccessToken();
  const { allowedHosts, endpoint } = paymentProviderConfiguration(
    requiredPayuValue('PAYU_PAYMENT_LINK_ENDPOINT'),
  );
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      merchantId: requiredPayuValue('PAYU_MERCHANT_ID'),
      mid: requiredPayuValue('PAYU_MERCHANT_ID'),
    },
    body: JSON.stringify({
      currency: input.currency,
      description:
        input.description?.trim().slice(0, 120) ??
        `Mandyal Travels hotel booking ${input.reference.slice(0, 80)}`,
      failureURL: `${callback.toString()}&outcome=failed`,
      invoiceNumber: providerRef,
      isAmountFilledByCustomer: false,
      isPartialPaymentAllowed: false,
      maxPaymentsAllowed: 1,
      source: 'API',
      subAmount: input.amount,
      successURL: `${callback.toString()}&outcome=success`,
      transactionId: providerRef,
      udf: { udf1: input.reference.slice(0, 100) },
      viaEmail: false,
      viaSms: false,
      viaWhatsapp: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as {
    result?: { invoiceNumber?: unknown; paymentLink?: unknown };
    status?: unknown;
  };
  if (
    Number(payload.status) !== 0 ||
    payload.result?.invoiceNumber !== providerRef ||
    typeof payload.result.paymentLink !== 'string' ||
    !isSafeHostedCheckoutUrl(payload.result.paymentLink, allowedHosts)
  ) {
    throw new Error('PAYMENT_PROVIDER_INVALID_RESPONSE');
  }
  return {
    providerRef,
    checkoutUrl: payload.result.paymentLink,
    expiresAt: paymentIntentExpiry(),
  };
}

export async function verifyPayuTransaction(
  transactionId: string,
): Promise<PayuVerifiedTransaction> {
  const key = requiredPayuValue('PAYU_MERCHANT_KEY');
  const salt = requiredPayuValue('PAYU_MERCHANT_SALT');
  const command = 'verify_payment';
  const response = await fetch(payuEndpoint('PAYU_COMMAND_ENDPOINT'), {
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
}) {
  if (process.env.PAYMENT_PROVIDER_ID === 'payu') {
    return createPayuPaymentLink(input);
  }
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
