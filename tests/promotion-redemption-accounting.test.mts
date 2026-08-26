import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const service = readFileSync('services/promotionRedemptionService.ts', 'utf8');
const checkout = readFileSync('app/api/v1/payments/checkout-intents/route.ts', 'utf8');
const trips = readFileSync('app/api/v1/account/trips/route.ts', 'utf8');
const bookings = readFileSync('repositories/bookingRepository.ts', 'utf8');
const sqliteSchema = readFileSync('prisma/schema.prisma', 'utf8');
const postgresSchema = readFileSync('prisma/postgresql/schema.prisma', 'utf8');

test('usage-capped claims use an atomic guarded campaign increment', () => {
  assert.match(service, /usageCount:\s*\{\s*lt:\s*campaign\.usageLimit\s*\}/);
  assert.match(service, /data:\s*\{\s*usageCount:\s*\{\s*increment:\s*1\s*\}\s*\}/);
  assert.match(service, /PROMOTION_USAGE_EXHAUSTED/);
  assert.match(service, /findUnique\(\{\s*where:\s*\{\s*claimKey:\s*input\.claimKey\s*\}/);
});

test('redemption and reversal remain inside booking and trip persistence transactions', () => {
  assert.match(checkout, /prisma\.\$transaction[\s\S]*reserveStoredPromotion/);
  assert.match(trips, /prisma\.\$transaction[\s\S]*reserveStoredPromotion[\s\S]*redeemPromotion/);
  assert.match(bookings, /transaction\.booking\.create[\s\S]*redeemPromotion/);
  assert.match(bookings, /refundPayment[\s\S]*reversePromotionForBooking/);
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
