import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  isConfirmedFullRefund,
  isPromotionAuthorizationWithinWindow,
  publicCheckoutIntent,
} from '../services/promotionRedemptionRules.ts';

const service = readFileSync('services/promotionRedemptionService.ts', 'utf8');
const checkout = readFileSync('app/api/v1/payments/checkout-intents/route.ts', 'utf8');
const trips = readFileSync('app/api/v1/account/trips/route.ts', 'utf8');
const bookings = readFileSync('repositories/bookingRepository.ts', 'utf8');
const promotions = readFileSync('services/promotionService.ts', 'utf8');
const reservationRoute = readFileSync('app/api/v1/promotions/reservations/route.ts', 'utf8');
const refundRoute = readFileSync('app/api/v1/admin/finance/refunds/[refundId]/route.ts', 'utf8');
const sqliteSchema = readFileSync('prisma/schema.prisma', 'utf8');
const postgresSchema = readFileSync('prisma/postgresql/schema.prisma', 'utf8');

test('usage-capped claims use an atomic guarded campaign increment', () => {
  assert.match(service, /usageCount:\s*\{\s*lt:\s*campaign\.usageLimit\s*\}/);
  assert.match(service, /data:\s*\{\s*usageCount:\s*\{\s*increment:\s*1\s*\}\s*\}/);
  assert.match(service, /PROMOTION_USAGE_EXHAUSTED/);
  assert.match(service, /findUnique\(\{\s*where:\s*\{\s*claimKey:\s*input\.claimKey\s*\}/);
});

test('abandoned capped claims are reaped before public promotion eligibility is resolved', () => {
  assert.match(promotions, /releaseExpiredPromotionClaims/);
  assert.match(service, /usageCount:\s*\{\s*gt:\s*0\s*\}/);
  assert.match(service, /PROMOTION_USAGE_INCONSISTENT/);
});

test('transport promotions are reserved and validated before payment evidence', () => {
  assert.match(reservationRoute, /reserveStoredPromotion/);
  assert.match(reservationRoute, /isSameOriginMutation/);
  assert.match(reservationRoute, /userId:\s*user\.id/);
  assert.match(trips, /validateReservedPromotion[\s\S]*confirmTransportPayment/);
  assert.match(trips, /PROMOTION_RESERVATION_REQUIRED/);
  assert.match(trips, /redeemPromotion/);
});

test('valid capture authorization survives a delayed hotel return', () => {
  const expiresAt = new Date('2026-08-26T12:15:00.000Z');
  assert.equal(
    isPromotionAuthorizationWithinWindow(expiresAt, new Date('2026-08-26T12:14:59.999Z')),
    true,
  );
  assert.equal(
    isPromotionAuthorizationWithinWindow(expiresAt, new Date('2026-08-26T12:15:00.001Z')),
    false,
  );
  assert.match(bookings, /authorizedAt:\s*paymentContext\.capturedAt/);
});

test('promotion usage reverses only after provider-confirmed full refunds', () => {
  assert.equal(isConfirmedFullRefund(10_000, 9_999), false);
  assert.equal(isConfirmedFullRefund(10_000, 10_000), true);
  assert.equal(isConfirmedFullRefund(10_000, 12_000), true);
  assert.equal(isConfirmedFullRefund(0, 0), false);
  assert.doesNotMatch(bookings, /reversePromotionForBooking/);
  assert.match(refundRoute, /reversePromotionForConfirmedFullRefund/);
  assert.match(refundRoute, /status:\s*'APPROVED'/);
});

test('checkout responses expose one stable public shape', () => {
  const publicIntent = publicCheckoutIntent({
    amount: 12_345,
    checkoutUrl: 'https://payments.example.test/checkout/one',
    currency: 'INR',
    expiresAt: new Date('2026-08-26T12:15:00.000Z'),
    id: 'intent-1',
    status: 'CREATED',
  });
  assert.deepEqual(Object.keys(publicIntent).sort(), [
    'amount',
    'checkoutUrl',
    'currency',
    'expiresAt',
    'id',
    'status',
  ]);
  assert.match(checkout, /publicCheckoutIntent\(existing\)/);
  assert.match(checkout, /publicCheckoutIntent\(created\)/);
  assert.doesNotMatch(JSON.stringify(publicIntent), /promotionRedemption|providerRef/);
});

test('redemption remains inside booking and trip persistence transactions', () => {
  assert.match(checkout, /prisma\.\$transaction[\s\S]*reserveStoredPromotion/);
  assert.match(trips, /prisma\.\$transaction[\s\S]*redeemPromotion/);
  assert.match(bookings, /transaction\.booking\.create[\s\S]*redeemPromotion/);
  assert.match(service, /where:\s*\{\s*id:\s*claim\.id,\s*status:\s*'REDEEMED'\s*\}/);
});

test('SQLite and PostgreSQL keep the redemption contract in parity', () => {
  for (const schema of [sqliteSchema, postgresSchema]) {
    assert.match(schema, /model PromotionRedemption \{/);
    assert.match(schema, /usageCount\s+Int\s+@default\(0\)/);
    assert.match(schema, /checkoutIntentId\s+String\?\s+@unique/);
    assert.match(schema, /bookingId\s+String\?\s+@unique/);
    assert.match(schema, /customerTripId\s+String\?\s+@unique/);
  }
});
