import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertPaymentProviderCapability,
  paymentProviderCapabilities,
  selectedPaymentProvider,
} from '../lib/payments/providerSelection.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Razorpay is the only named active payment provider', () => {
  assert.equal(selectedPaymentProvider('razorpay'), 'razorpay');
  assert.equal(selectedPaymentProvider('payu'), 'configured-gateway');
  assert.deepEqual(paymentProviderCapabilities('razorpay'), {
    hostedCheckout: true,
    refunds: true,
    splitSettlements: true,
  });
  for (const capability of ['hostedCheckout', 'refunds', 'splitSettlements'] as const)
    assert.doesNotThrow(() => assertPaymentProviderCapability('razorpay', capability));
});

test('Razorpay uses dedicated checkout, webhook, refund and Route adapters', () => {
  const gateway = read('services/paymentGatewayService.ts');
  const webhook = read('app/api/v1/payments/webhooks/[provider]/route.ts');
  const checkout = read('app/api/v1/payments/checkout-intents/route.ts');
  assert.match(gateway, /createRazorpayOrder/);
  assert.match(gateway, /\/orders/);
  assert.match(webhook, /verifyRazorpayWebhookSignature/);
  assert.match(checkout, /RAZORPAY_ROUTE_ENABLED/);
  assert.match(gateway, /on_hold: true/);
});

test('Razorpay secrets remain server-only and activation defaults off', () => {
  const example = read('.env.example');
  const client = read('app/payments/razorpay/[orderId]/RazorpayCheckout.tsx');
  for (const name of ['RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
    assert.match(example, new RegExp(`${name}=""`));
    assert.doesNotMatch(client, new RegExp(name));
  }
  assert.match(example, /PAYMENT_PROVIDER_ID="razorpay"/);
  assert.match(example, /RAZORPAY_INTEGRATION_ENABLED="false"/);
  assert.match(example, /RAZORPAY_ROUTE_ENABLED="false"/);
});
