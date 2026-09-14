import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertPaymentProviderCapability,
  paymentProviderCapabilities,
  selectedPaymentProvider,
} from '../lib/payments/providerSelection.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('PayU remains selected while Razorpay is only prepared', () => {
  assert.equal(selectedPaymentProvider('payu'), 'payu');
  assert.equal(paymentProviderCapabilities('payu').hostedCheckout, true);
  assert.doesNotThrow(() => assertPaymentProviderCapability('payu', 'hostedCheckout'));
});

test('Razorpay fails closed for every money-moving capability', () => {
  assert.equal(selectedPaymentProvider('razorpay'), 'razorpay');
  assert.deepEqual(paymentProviderCapabilities('razorpay'), {
    hostedCheckout: false,
    refunds: false,
    splitSettlements: false,
  });
  for (const capability of ['hostedCheckout', 'refunds', 'splitSettlements'] as const) {
    assert.throws(
      () => assertPaymentProviderCapability('razorpay', capability),
      /PAYMENT_PROVIDER_NOT_CONFIGURED/,
    );
  }
});

test('Razorpay cannot fall through to the generic checkout, webhook, or refund adapters', () => {
  const gateway = read('services/paymentGatewayService.ts');
  const webhook = read('app/api/v1/payments/webhooks/[provider]/route.ts');
  const release = read('scripts/verify-release-env.mjs');
  assert.match(gateway, /assertPaymentProviderCapability\(provider, 'hostedCheckout'\)/);
  assert.match(gateway, /assertPaymentProviderCapability\(provider, 'refunds'\)/);
  assert.match(webhook, /provider === 'razorpay'/);
  assert.match(release, /PAYMENT_PROVIDER_ID === 'razorpay'/);
});

test('Razorpay secrets remain server-only placeholders and activation defaults off', () => {
  const example = read('.env.example');
  const client = read('app/hotels/[slug]/booking/payment/page.tsx');
  for (const name of ['RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
    assert.match(example, new RegExp(`${name}=""`));
    assert.doesNotMatch(client, new RegExp(name));
  }
  assert.match(example, /RAZORPAY_INTEGRATION_ENABLED="false"/);
  assert.match(example, /RAZORPAY_ROUTE_ENABLED="false"/);
});
