import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createTransportPaymentEvidence,
  isDemoTransportCheckoutEnabled,
  verifyTransportPaymentEvidence,
  type TransportPaymentEvidenceClaims,
} from '../lib/payments/transportEvidence.ts';

const secret = 'test-transport-payment-secret-with-32-characters';
const now = new Date('2026-08-26T00:10:00.000Z');
const claims: TransportPaymentEvidenceClaims = {
  amount: 12_500,
  capturedAt: '2026-08-26T00:09:00.000Z',
  confirmationCode: 'MF12345678',
  currency: 'INR',
  expiresAt: '2026-08-26T00:29:00.000Z',
  productType: 'FLIGHT',
  provider: 'configured-gateway',
  providerRef: 'provider-payment-123',
  userId: 'user-123',
  version: 1,
};

test('transport payment evidence is signed, scoped, and short lived', () => {
  const evidence = createTransportPaymentEvidence(claims, secret);
  assert.deepEqual(verifyTransportPaymentEvidence(evidence, secret, now), claims);
  assert.equal(verifyTransportPaymentEvidence(`${evidence}x`, secret, now), null);
  assert.equal(
    verifyTransportPaymentEvidence(evidence, secret, new Date('2026-08-26T00:30:00.000Z')),
    null,
  );
});

test('transport demo checkout requires explicit non-production opt in', () => {
  assert.equal(
    isDemoTransportCheckoutEnabled({
      ALLOW_DEMO_TRANSPORT_CHECKOUT: 'true',
      NODE_ENV: 'development',
    }),
    true,
  );
  assert.equal(
    isDemoTransportCheckoutEnabled({
      ALLOW_DEMO_TRANSPORT_CHECKOUT: 'true',
      NODE_ENV: 'production',
    }),
    false,
  );
  assert.equal(isDemoTransportCheckoutEnabled({ NODE_ENV: 'test' }), false);
});

test('transport trip creation fails closed before reservation persistence', () => {
  const route = readFileSync('app/api/v1/account/trips/route.ts', 'utf8');
  const confirmation = route.indexOf('confirmTransportPayment({');
  const persistence = route.indexOf('if (!businessCheckout) {', confirmation);
  assert.ok(confirmation > 0);
  assert.ok(persistence > confirmation);
  assert.match(route, /evidence: body\.paymentEvidence/);
  assert.match(route, /TransportPaymentEvidenceError/);

  for (const path of [
    'components/flight/FlightPaymentForm.tsx',
    'components/bus/BusPaymentForm.tsx',
    'components/car/CarPaymentForm.tsx',
  ]) {
    const form = readFileSync(path, 'utf8');
    assert.match(form, /if \(!demoCheckoutEnabled\)/);
    assert.match(form, /paymentEvidence: DEMO_TRANSPORT_PAYMENT_EVIDENCE/);
    assert.doesNotMatch(form, /paymentStatus: 'captured'/);
  }
});
