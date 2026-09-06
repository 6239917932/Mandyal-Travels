import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  parsePartnerDirectBookingRequest,
  parsePartnerDirectQuoteRequest,
  PARTNER_DIRECT_IDEMPOTENCY_PATTERN,
} from '../lib/hotel/partnerDirectBookingRules.ts';

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test('direct quote validation accepts bounded future inventory requests', () => {
  assert.deepEqual(
    parsePartnerDirectQuoteRequest({
      adults: 2,
      checkInDate: dateOffset(1),
      checkOutDate: dateOffset(3),
      children: 1,
      hotelSlug: 'hotel-one',
      ratePlanId: 'rate-one',
      rooms: 1,
      roomTypeId: 'room-one',
    }),
    {
      adults: 2,
      checkInDate: dateOffset(1),
      checkOutDate: dateOffset(3),
      children: 1,
      hotelSlug: 'hotel-one',
      ratePlanId: 'rate-one',
      rooms: 1,
      roomTypeId: 'room-one',
    },
  );
});

test('direct quote validation rejects invalid dates, past arrivals and unsafe quantities', () => {
  const base = {
    adults: 1,
    checkInDate: dateOffset(1),
    checkOutDate: dateOffset(2),
    children: 0,
    hotelSlug: 'hotel-one',
    ratePlanId: 'rate-one',
    rooms: 1,
    roomTypeId: 'room-one',
  };
  assert.equal(parsePartnerDirectQuoteRequest({ ...base, checkOutDate: base.checkInDate }), null);
  assert.equal(parsePartnerDirectQuoteRequest({ ...base, checkInDate: '2024-02-30' }), null);
  assert.equal(parsePartnerDirectQuoteRequest({ ...base, rooms: 21 }), null);
  assert.equal(parsePartnerDirectQuoteRequest({ ...base, children: -1 }), null);
});

test('direct booking validation normalizes the guest email and bounds guest fields', () => {
  const parsed = parsePartnerDirectBookingRequest({
    availabilityLockId: 'lock-one',
    guest: {
      email: ' Guest@Example.COM ',
      firstName: 'Jasveer',
      lastName: 'Singh',
      phone: '+91 98765 43210',
      specialRequests: 'Late arrival',
    },
    hotelSlug: 'hotel-one',
    quoteId: 'quote-one',
  });
  assert.equal(parsed?.guest.email, 'guest@example.com');
  assert.equal(parsed?.guest.specialRequests, 'Late arrival');
  assert.equal(
    parsePartnerDirectBookingRequest({
      ...parsed,
      guest: { ...parsed?.guest, phone: '123' },
    }),
    null,
  );
});

test('direct booking idempotency keys use a dedicated UUID namespace', () => {
  assert.equal(
    PARTNER_DIRECT_IDEMPOTENCY_PATTERN.test('partner-direct-123e4567-e89b-42d3-a456-426614174000'),
    true,
  );
  assert.equal(PARTNER_DIRECT_IDEMPOTENCY_PATTERN.test('hotel-booking-reused'), false);
});

test('direct booking endpoints preserve origin, ownership, idempotency and audit boundaries', async () => {
  const [quoteRoute, bookingRoute, service, bookingList, registry] = await Promise.all([
    readFile(
      new URL('../app/api/v1/partner/direct-bookings/quotes/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../app/api/v1/partner/direct-bookings/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerDirectBookingService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/bookings/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(quoteRoute, /isSameOriginMutation\(request\)/);
  assert.match(bookingRoute, /isSameOriginMutation\(request\)/);
  assert.match(bookingRoute, /PARTNER_DIRECT_IDEMPOTENCY_PATTERN/);
  assert.match(service, /listingSource: 'MANAGED', partnerId, status: 'ACTIVE'/);
  assert.match(service, /source: 'PARTNER_DIRECT'/);
  assert.match(service, /provider: 'PAY_AT_PROPERTY'/);
  assert.match(service, /status: 'pending'/);
  assert.match(service, /action: 'DIRECT_BOOKING_CREATED'/);
  assert.doesNotMatch(service, /financialJournal\.create/);
  assert.match(bookingList, /Due at property/);
  assert.match(registry, /href: '\/partner\/pms\/walk-in'/);
});
