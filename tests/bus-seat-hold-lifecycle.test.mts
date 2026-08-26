import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BUS_SEAT_HOLD_DURATION_MS,
  busSeatSetsMatch,
  directBusTripId,
} from '../lib/bus/bookingRules.ts';

test('direct bus offer identifiers resolve only bounded direct trip inventory', () => {
  assert.equal(directBusTripId('direct-bus-trip-trip-123'), 'trip-123');
  assert.equal(directBusTripId('fixture-bus-1'), undefined);
  assert.equal(directBusTripId('direct-bus-trip-'), undefined);
  assert.equal(directBusTripId(`direct-bus-trip-${'x'.repeat(121)}`), undefined);
});

test('seat hold comparison is order independent and exact', () => {
  assert.equal(busSeatSetsMatch(['1A', '2D'], ['2d', '1a']), true);
  assert.equal(busSeatSetsMatch(['1A', '2D'], ['1A']), false);
  assert.equal(busSeatSetsMatch(['1A', '2D'], ['1A', '3D']), false);
  assert.equal(BUS_SEAT_HOLD_DURATION_MS, 10 * 60 * 1000);
});

test('database contract enforces a single active owner per physical bus seat', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const migration = readFileSync(
    'prisma/migrations/20260826090000_add_partner_bus_seat_holds/migration.sql',
    'utf8',
  );
  assert.match(schema, /model PartnerBusSeatHoldSeat[\s\S]*@@unique\(\[tripId, seatNumber\]\)/);
  assert.match(migration, /PartnerBusSeatHoldSeat_tripId_seatNumber_key/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test('hold API is authenticated, same-origin protected, and rate limited', () => {
  const route = readFileSync('app/api/v1/buses/seat-holds/route.ts', 'utf8');
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /consumeRateLimit\(/);
  assert.match(route, /busSeatHoldService\.release/);
});

test('final direct booking validates and consumes the user-owned hold transactionally', () => {
  const service = readFileSync('services/partnerOperationsService.ts', 'utf8');
  const route = readFileSync('app/api/v1/account/trips/route.ts', 'utf8');
  assert.match(service, /partnerBusSeatHold\.findFirst/);
  assert.match(service, /userId: input\.userId/);
  assert.match(service, /partnerBusSeatHold\.deleteMany/);
  assert.match(route, /holdId: busSeatHoldId as string/);
  assert.match(route, /userId: user\.id/);
});
