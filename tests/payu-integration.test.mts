import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('PayU checkout is fixed-amount, single-use, and server verified', () => {
  const gateway = read('services/paymentGatewayService.ts');
  assert.match(gateway, /isAmountFilledByCustomer: false/);
  assert.match(gateway, /isPartialPaymentAllowed: false/);
  assert.match(gateway, /maxPaymentsAllowed: 1/);
  assert.match(gateway, /verify_payment/);
  assert.match(gateway, /PAYU_COMMAND_ENDPOINT/);
  assert.match(gateway, /PAYU_MERCHANT_SALT/);
});

test('PayU return and webhook cannot confirm from browser status alone', () => {
  const callback = read('app/api/v1/payments/payu/return/route.ts');
  const webhook = read('app/api/v1/payments/webhooks/[provider]/route.ts');
  const reconciliation = read('services/payuPaymentReconciliationService.ts');
  assert.match(callback, /reconcilePayuCheckout/);
  assert.doesNotMatch(callback, /searchParams\.get\('outcome'\)/);
  assert.match(webhook, /verifyPayuResponseHash/);
  assert.match(webhook, /reconcilePayuCheckout/);
  assert.match(reconciliation, /verified\.captured/);
  assert.match(reconciliation, /verified\.amount === intent\.amount/);
});

test('PayU secrets stay server-only and production activation remains gated', () => {
  const example = read('.env.example');
  const client = read('app/hotels/[slug]/booking/payment/page.tsx');
  const featureFlags = read('services/platformFeatureFlagRules.ts');
  for (const name of ['PAYU_CLIENT_SECRET', 'PAYU_MERCHANT_KEY', 'PAYU_MERCHANT_SALT']) {
    assert.match(example, new RegExp(`${name}=""`));
    assert.doesNotMatch(client, new RegExp(name));
  }
  assert.match(featureFlags, /key: 'LIVE_MARKETPLACE_PAYMENTS'/);
  assert.match(featureFlags, /defaultEnabled: false/);
});
