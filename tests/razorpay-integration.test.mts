import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  rupeesToPaise,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../lib/payments/razorpay.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Razorpay checkout is fixed-amount, single-order, and server verified', () => {
  const gateway = read('services/paymentGatewayService.ts');
  assert.match(gateway, /partial_payment: false/);
  assert.match(gateway, /rupeesToPaise/);
  assert.match(gateway, /https:\/\/api\.razorpay\.com\/v1/);
  assert.match(
    read('app/api/v1/payments/razorpay/confirm/route.ts'),
    /verifyRazorpayCheckoutSignature/,
  );
});

test('Razorpay HMAC verification rejects modified checkout and webhook evidence', () => {
  const secret = 'server-only-test-secret';
  const orderId = 'order_1234567890';
  const paymentId = 'pay_1234567890';
  const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(verifyRazorpayCheckoutSignature({ orderId, paymentId, signature, secret }), true);
  assert.equal(
    verifyRazorpayCheckoutSignature({ orderId, paymentId: 'pay_0987654321', signature, secret }),
    false,
  );
  const payload = '{"event":"payment.captured"}';
  const webhookSignature = createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(
    verifyRazorpayWebhookSignature({ payload, signature: webhookSignature, secret }),
    true,
  );
  assert.equal(
    verifyRazorpayWebhookSignature({ payload: `${payload}x`, signature: webhookSignature, secret }),
    false,
  );
});

test('Razorpay amount conversion is exact and integer-only', () => {
  assert.equal(rupeesToPaise(125), 12500);
  assert.throws(() => rupeesToPaise(1.5), /PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT/);
  assert.throws(() => rupeesToPaise(0), /PAYMENT_PROVIDER_UNSUPPORTED_AMOUNT/);
});
