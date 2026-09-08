import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HotelBanquetRuleError,
  nextHotelBanquetStatuses,
  normalizeHotelBanquetEvent,
  normalizeHotelBanquetTransition,
} from '../lib/pms/banquets.ts';

const root = new URL('../', import.meta.url);
const source = (path: string) => readFile(new URL(path, root), 'utf8');
const validEvent = {
  contactEmail: 'events@example.com',
  endTime: '18:30',
  eventDate: '2026-10-10',
  eventName: 'Autumn conference',
  eventType: 'conference',
  expectedGuests: '120',
  organizerName: 'Example Company',
  quoteAmount: '250000',
  requirements: 'Projector and vegetarian lunch',
  startTime: '09:30',
  venueName: 'Grand Hall',
};

test('banquet enquiries normalize into bounded operational values', () => {
  assert.deepEqual(normalizeHotelBanquetEvent(validEvent), {
    contactEmail: 'events@example.com',
    contactPhone: '',
    endTime: '18:30',
    eventDate: '2026-10-10',
    eventName: 'Autumn conference',
    eventType: 'CONFERENCE',
    expectedGuests: 120,
    organizerName: 'Example Company',
    quoteAmount: 250000,
    requirements: 'Projector and vegetarian lunch',
    startTime: '09:30',
    venueName: 'Grand Hall',
  });
});

test('banquet rules reject missing contacts and invalid time windows', () => {
  assert.throws(
    () => normalizeHotelBanquetEvent({ ...validEvent, contactEmail: '' }),
    (error) => error instanceof HotelBanquetRuleError && error.code === 'CONTACT_REQUIRED',
  );
  assert.throws(
    () => normalizeHotelBanquetEvent({ ...validEvent, endTime: '09:00' }),
    (error) => error instanceof HotelBanquetRuleError && error.code === 'INVALID_EVENT_WINDOW',
  );
  assert.throws(
    () => normalizeHotelBanquetEvent({ ...validEvent, eventDate: '2026-02-31' }),
    (error) => error instanceof HotelBanquetRuleError && error.code === 'INVALID_EVENT_DATE',
  );
});

test('banquet status machine is forward-only and cancellation requires a reason', () => {
  assert.deepEqual(nextHotelBanquetStatuses('INQUIRY'), ['PROVISIONAL', 'CANCELLED']);
  assert.deepEqual(nextHotelBanquetStatuses('PROVISIONAL'), ['CONFIRMED', 'CANCELLED']);
  assert.deepEqual(nextHotelBanquetStatuses('CONFIRMED'), ['COMPLETED', 'CANCELLED']);
  assert.deepEqual(nextHotelBanquetStatuses('COMPLETED'), []);
  assert.throws(
    () => normalizeHotelBanquetTransition({ currentStatus: 'CONFIRMED', targetStatus: 'INQUIRY' }),
    (error) => error instanceof HotelBanquetRuleError && error.code === 'INVALID_EVENT_TRANSITION',
  );
  assert.throws(
    () =>
      normalizeHotelBanquetTransition({
        currentStatus: 'INQUIRY',
        note: 'no',
        targetStatus: 'CANCELLED',
      }),
    (error) =>
      error instanceof HotelBanquetRuleError && error.code === 'CANCELLATION_REASON_REQUIRED',
  );
});

test('banquet service scopes reads and writes and prevents venue conflicts', async () => {
  const service = await source('services/partnerBanquetService.ts');
  assert.match(service, /where: \{ partnerId: input\.partnerId, propertyId: selected\.id \}/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /status: \{ in: \['PROVISIONAL', 'CONFIRMED'\] \}/);
  assert.match(service, /startTime: \{ lt: input\.endTime \}/);
  assert.match(service, /endTime: \{ gt: input\.startTime \}/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /updateMany\(/);
  assert.match(service, /partnerAuditLog\.create/);
});

test('banquet mutations require same-origin partner-admin sessions', async () => {
  const routes = await Promise.all([
    source('app/api/v1/partner/banquet-events/route.ts'),
    source('app/api/v1/partner/banquet-events/[eventId]/route.ts'),
  ]);
  for (const route of routes) {
    assert.match(route, /isSameOriginMutation\(request\)/);
    assert.match(route, /access\.memberRole !== 'ADMIN'/);
    assert.match(route, /!access\.userId/);
  }
});

test('banquet models and both database migrations preserve immutable history', async () => {
  const schema = await source('prisma/schema.prisma');
  const migrations = await Promise.all([
    source('prisma/migrations/20260908023000_add_hotel_banquet_events/migration.sql'),
    source('prisma/postgresql/migrations/20260908023000_add_hotel_banquet_events/migration.sql'),
  ]);
  assert.match(schema, /model HotelBanquetEvent[\s\S]*createIdempotencyKey\s+String\s+@unique/);
  assert.match(
    schema,
    /model HotelBanquetEventHistory[\s\S]*@@unique\(\[banquetEventId, version\]\)/,
  );
  for (const migration of migrations) {
    assert.match(migration, /CREATE TABLE "HotelBanquetEvent"/);
    assert.match(migration, /CREATE TABLE "HotelBanquetEventHistory"/);
  }
});

test('banquet module opens the live workflow and states its safety boundary', async () => {
  const registry = await source('lib/pms/moduleRegistry.ts');
  const page = await source('app/partner/pms/banquets/page.tsx');
  assert.match(registry, /code: 'BQ'[\s\S]*href: '\/partner\/pms\/banquets'[\s\S]*status: 'LIVE'/);
  assert.match(page, /does not block guest rooms/);
  assert.match(page, /issue tax invoices/);
  assert.match(page, /partner administrator/);
});
