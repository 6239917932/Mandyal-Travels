import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminBookingDirectoryPath,
  bookingCreatedAtRange,
  normalizeAdminBookingDirectoryFilters,
} from '../services/adminBookingDirectoryService.ts';

test('admin booking filters normalize bounded supported values', () => {
  assert.deepEqual(
    normalizeAdminBookingDirectoryFilters({
      from: '2026-08-01',
      hotelPage: '2',
      product: 'flight',
      q: `  ${'traveller '.repeat(20)}  `,
      status: 'confirmed',
      to: '2026-08-31',
      tripPage: '3',
    }),
    {
      from: '2026-08-01',
      hotelPage: 2,
      product: 'FLIGHT',
      query: 'traveller '.repeat(20).trim().slice(0, 100),
      status: 'CONFIRMED',
      to: '2026-08-31',
      tripPage: 3,
    },
  );
});

test('admin booking filters reject unsupported values and reversed dates', () => {
  assert.deepEqual(
    normalizeAdminBookingDirectoryFilters({
      from: '2026-09-01',
      hotelPage: '-2',
      product: 'cashfree',
      status: 'refunded-without-review',
      to: '2026-08-01',
      tripPage: '0',
    }),
    { from: '', hotelPage: 1, product: 'ALL', query: '', status: 'ALL', to: '', tripPage: 1 },
  );
});

test('admin booking paths preserve filters and date ranges use an exclusive upper bound', () => {
  const filters = normalizeAdminBookingDirectoryFilters({
    from: '2026-08-01',
    product: 'car',
    q: 'MT-CAR-1',
    to: '2026-08-31',
  });
  assert.equal(
    adminBookingDirectoryPath(filters, { hotelPage: 0, tripPage: 4 }),
    '/admin/bookings?hotelPage=1&tripPage=4&q=MT-CAR-1&product=CAR&from=2026-08-01&to=2026-08-31',
  );
  assert.deepEqual(bookingCreatedAtRange(filters.from, filters.to), {
    gte: new Date('2026-08-01T00:00:00.000Z'),
    lt: new Date('2026-09-01T00:00:00.000Z'),
  });
});
