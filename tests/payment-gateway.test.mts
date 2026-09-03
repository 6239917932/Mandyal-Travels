import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, createHmac } from 'node:crypto';
import {
  isSafeHostedCheckoutUrl,
  isCheckoutQuotePayable,
  isCompletedProviderRefundStatus,
  paymentIntentExpiry,
  verifyPaymentWebhook,
} from '../lib/payments/gateway.ts';
import {
  parsePayuAmount,
  parsePayuVerifiedTransaction,
  payuCommandHash,
  payuTransactionId,
  verifyPayuResponseHash,
} from '../lib/payments/payu.ts';

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

test('checkout rejects consumed, released, converted, and expired quote locks', () => {
  const now = new Date('2026-08-23T00:00:00Z');
  const payable = {
    lockExpiresAt: new Date('2026-08-23T00:10:00Z'),
    lockStatus: 'ACTIVE',
    quoteExpiresAt: new Date('2026-08-23T00:10:00Z'),
  };
  assert.equal(isCheckoutQuotePayable(payable, now), true);
  assert.equal(isCheckoutQuotePayable({ ...payable, bookingId: 'booking-1' }, now), false);
  assert.equal(isCheckoutQuotePayable({ ...payable, lockStatus: 'CONVERTED' }, now), false);
  assert.equal(isCheckoutQuotePayable({ ...payable, lockStatus: 'RELEASED' }, now), false);
  assert.equal(
    isCheckoutQuotePayable({ ...payable, lockExpiresAt: new Date('2026-08-22T23:59:59Z') }, now),
    false,
  );
});

test('refund accounting waits for a completed provider status', () => {
  assert.equal(isCompletedProviderRefundStatus('completed'), true);
  assert.equal(isCompletedProviderRefundStatus('SUCCEEDED'), true);
  assert.equal(isCompletedProviderRefundStatus('pending'), false);
  assert.equal(isCompletedProviderRefundStatus(undefined), false);
});

test('PayU references are deterministic, bounded, and contain no booking identifier', () => {
  const reference = payuTransactionId('payment-550e8400-e29b-41d4-a716-446655440000');
  assert.match(reference, /^MT[0-9a-f]{30}$/);
  assert.equal(reference, payuTransactionId('payment-550e8400-e29b-41d4-a716-446655440000'));
  assert.equal(reference.includes('550e8400'), false);
});

test('PayU command and reverse-response hashes follow the documented SHA-512 order', () => {
  const key = 'merchant-key';
  const salt = 'merchant-salt';
  const transactionId = 'MT123456789012345678901234567890';
  assert.equal(
    payuCommandHash({ command: 'verify_payment', key, salt, variable: transactionId }),
    createHash('sha512').update(`${key}|verify_payment|${transactionId}|${salt}`).digest('hex'),
  );
  const fields = {
    amount: '100.00',
    email: 'guest@example.com',
    firstname: 'Guest',
    key,
    productinfo: 'Hotel booking',
    status: 'success',
    txnid: transactionId,
    udf1: 'quote-1',
    udf2: '',
    udf3: '',
    udf4: '',
    udf5: '',
  };
  const hash = createHash('sha512')
    .update(
      [
        salt,
        'success',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'quote-1',
        'guest@example.com',
        'Guest',
        'Hotel booking',
        '100.00',
        transactionId,
        key,
      ].join('|'),
    )
    .digest('hex');
  assert.equal(verifyPayuResponseHash({ ...fields, hash }, salt), true);
  assert.equal(verifyPayuResponseHash({ ...fields, amount: '101.00', hash }, salt), false);
});

test('PayU verification accepts only exact whole-INR captured transactions', () => {
  const transactionId = 'MT123456789012345678901234567890';
  assert.equal(parsePayuAmount('100.00'), 100);
  assert.equal(parsePayuAmount('100.50'), null);
  assert.deepEqual(
    parsePayuVerifiedTransaction(transactionId, {
      status: 1,
      transaction_details: {
        [transactionId]: {
          amt: '100.00',
          mihpayid: '403993715521937565',
          status: 'success',
          unmappedstatus: 'captured',
        },
      },
    }),
    {
      amount: 100,
      captured: true,
      failed: false,
      payuPaymentId: '403993715521937565',
      status: 'captured',
      transactionId,
    },
  );
});
