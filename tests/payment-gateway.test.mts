import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import {
  isSafeHostedCheckoutUrl,
  paymentIntentExpiry,
  verifyPaymentWebhook,
} from '../lib/payments/gateway.ts';

test('hosted payment URLs require remote HTTPS origins', () => {
  const hosts = ['checkout.example.com'];
  assert.equal(isSafeHostedCheckoutUrl('https://checkout.example.com/pay/123', hosts), true);
  assert.equal(isSafeHostedCheckoutUrl('https://evil.example.com/pay/123', hosts), false);
  assert.equal(isSafeHostedCheckoutUrl('http://checkout.example.com/pay/123', hosts), false);
  assert.equal(isSafeHostedCheckoutUrl('https://localhost/pay/123', hosts), false);
});

test('payment checkout intents expire after twenty minutes', () => {
  assert.equal(
    paymentIntentExpiry(new Date('2026-01-01T00:00:00Z')).toISOString(),
    '2026-01-01T00:20:00.000Z',
  );
});

test('payment webhook verification rejects replayed and modified payloads', () => {
  const payload = '{"id":"event-1"}';
  const secret = 'test-webhook-secret';
  const timestamp = '1767225600';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const now = 1767225600 * 1_000;
  assert.equal(verifyPaymentWebhook({ payload, secret, signature, timestamp, now }), true);
  assert.equal(
    verifyPaymentWebhook({ payload: `${payload}x`, secret, signature, timestamp, now }),
    false,
  );
  assert.equal(
    verifyPaymentWebhook({ payload, secret, signature, timestamp, now: now + 360_001 }),
    false,
  );
});
