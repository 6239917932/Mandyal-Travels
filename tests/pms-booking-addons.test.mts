import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { bookingAddonMultiplier, normalizeHotelBookingAddon } from '../lib/pms/bookingAddons.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('booking add-ons normalize bounded price, tax, quantity and availability controls', () => {
  assert.deepEqual(
    normalizeHotelBookingAddon({
      category: 'meal',
      description: ' Daily buffet breakfast. ',
      endsOn: '2027-03-31',
      maxQuantity: '4',
      minQuantity: '1',
      name: ' Breakfast buffet ',
      pricingMode: 'per_guest_per_night',
      startsOn: '2026-10-01',
      taxRateBps: '500',
      unitAmount: '450',
    }),
    {
      category: 'MEAL',
      currency: 'INR',
      description: 'Daily buffet breakfast.',
      endsOn: '2027-03-31',
      maxQuantity: 4,
      minQuantity: 1,
      name: 'Breakfast buffet',
      pricingMode: 'PER_GUEST_PER_NIGHT',
      startsOn: '2026-10-01',
      taxRateBps: 500,
      unitAmount: 450,
    },
  );
  assert.equal(normalizeHotelBookingAddon({ name: 'x' }), undefined);
  assert.equal(
    normalizeHotelBookingAddon({
      category: 'MEAL',
      maxQuantity: 1,
      minQuantity: 2,
      name: 'Breakfast',
      pricingMode: 'PER_BOOKING',
      taxRateBps: 0,
      unitAmount: 100,
    }),
    undefined,
  );
});

test('booking add-on price multipliers cover booking, stay, room and guest bases', () => {
  const base = { adults: 2, children: 1, nights: 3, quantity: 2, rooms: 2 };
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_BOOKING' }), 2);
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_NIGHT' }), 6);
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_ROOM' }), 4);
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_ROOM_PER_NIGHT' }), 12);
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_GUEST' }), 6);
  assert.equal(bookingAddonMultiplier({ ...base, pricingMode: 'PER_GUEST_PER_NIGHT' }), 18);
});

test('add-on persistence and quote integration preserve tenant and immutable-price boundaries', async () => {
  const [schema, postgres, sqliteMigration, postgresMigration, service, route, quoteRepository] =
    await Promise.all([
      read('prisma/schema.prisma'),
      read('prisma/postgresql/schema.prisma'),
      read('prisma/migrations/20260914230000_add_hotel_booking_addons/migration.sql'),
      read('prisma/postgresql/migrations/20260914230000_add_hotel_booking_addons/migration.sql'),
      read('services/partnerBookingAddonService.ts'),
      read('app/api/v1/partner/booking-addons/route.ts'),
      read('repositories/quoteRepository.ts'),
    ]);
  for (const contract of [schema, postgres]) {
    assert.match(contract, /model HotelBookingAddon[\s\S]*@@unique\(\[propertyId, name\]\)/);
    assert.match(
      contract,
      /model PriceComponent[\s\S]*sourceId\s+String[\s\S]*pricingMode\s+String/,
    );
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelBookingAddon_propertyId_name_key/);
    assert.match(migration, /PriceComponent[\s\S]*pricingMode/);
  }
  assert.match(
    service,
    /property: \{ hotelSlug, publicationStatus: 'PUBLISHED', status: 'ACTIVE' \}/,
  );
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /Math\.round\(\(amount \* addon\.taxRateBps\) \/ 10_000\)/);
  assert.doesNotMatch(service, /hotelBookingAddon\.(delete|deleteMany)/);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(quoteRepository, /sourceId: component\.sourceId/);
  assert.match(quoteRepository, /pricingMode: component\.pricingMode/);
});

test('add-ons are live in PMS and itemized in the customer booking journey', async () => {
  const [registry, publicHotel, selection, review, bookingService, folioService] =
    await Promise.all([
      read('lib/pms/moduleRegistry.ts'),
      read('app/hotels/[slug]/page.tsx'),
      read('components/hotel/RoomSelectionButton.tsx'),
      read('app/hotels/[slug]/booking/page.tsx'),
      read('services/hotelBookingService.ts'),
      read('services/partnerHotelFolioService.ts'),
    ]);
  assert.match(
    registry,
    /code: 'BA'[\s\S]*href: '\/partner\/pms\/booking-addons'[\s\S]*status: 'LIVE'/,
  );
  assert.match(publicHotel, /listAvailableHotelBookingAddons/);
  assert.match(selection, /addons: Object\.entries\(selectedAddons\)/);
  assert.match(review, /booking\.pricing\.addonComponents\.map/);
  assert.match(bookingService, /totalAmount: components\.reduce/);
  assert.match(bookingService, /ADDON_NOT_AVAILABLE/);
  assert.match(folioService, /accommodationAmount: selectedBooking\.totalAmount/);
});
