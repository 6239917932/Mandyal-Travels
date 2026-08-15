import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafeHostedCheckoutUrl, paymentIntentExpiry } from '../lib/payments/gateway.ts';

test('hosted payment URLs require remote HTTPS origins', () => {
  assert.equal(isSafeHostedCheckoutUrl('https://checkout.example.com/pay/123'), true);
  assert.equal(isSafeHostedCheckoutUrl('http://checkout.example.com/pay/123'), false);
  assert.equal(isSafeHostedCheckoutUrl('https://localhost/pay/123'), false);
});

test('payment checkout intents expire after twenty minutes', () => {
  assert.equal(
    paymentIntentExpiry(new Date('2026-01-01T00:00:00Z')).toISOString(),
    '2026-01-01T00:20:00.000Z',
  );
});
