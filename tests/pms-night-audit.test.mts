import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  countNightAuditBlockers,
  nightAuditFingerprint,
  NightAuditRuleError,
  normalizeNightAuditClose,
  requireNightAuditIdempotencyKey,
} from '../lib/pms/nightAudit.ts';
import {
  isIsoCalendarDate,
  nextOperationalDate,
  resolveOperationalDate,
} from '../lib/pms/operationalDate.ts';

test('operational dates validate real calendar days and advance across boundaries', () => {
  assert.equal(isIsoCalendarDate('2026-02-28'), true);
  assert.equal(isIsoCalendarDate('2026-02-30'), false);
  assert.equal(nextOperationalDate('2026-02-28'), '2026-03-01');
  assert.equal(nextOperationalDate('2027-12-31'), '2028-01-01');
  assert.equal(
    resolveOperationalDate('', 'Asia/Kolkata', new Date('2026-09-06T20:00:00.000Z')),
    '2026-09-07',
  );
  assert.equal(resolveOperationalDate('2026-09-05', 'Asia/Kolkata'), '2026-09-05');
});

test('night audit close requires exact confirmation, a reason and a strong retry key', () => {
  assert.deepEqual(
    normalizeNightAuditClose({
      businessDate: '2026-09-07',
      confirmation: '2026-09-07',
      note: '  Departments   reconciled ',
    }),
    { businessDate: '2026-09-07', note: 'Departments reconciled' },
  );
  assert.throws(
    () =>
      normalizeNightAuditClose({
        businessDate: '2026-09-07',
        confirmation: 'CLOSE',
        note: 'Departments reconciled',
      }),
    NightAuditRuleError,
  );
  assert.throws(() => requireNightAuditIdempotencyKey('short'), NightAuditRuleError);
  assert.equal(requireNightAuditIdempotencyKey('123e4567-e89b-42d3-a456-426614174000').length, 36);
  assert.equal(nightAuditFingerprint({ date: '2026-09-07' }).length, 64);
});

test('night audit blocker total is deterministic and includes every hard gate', () => {
  assert.equal(
    countNightAuditBlockers({
      activePosOrders: 6,
      openCashierShifts: 1,
      overdueDepartures: 2,
      pendingAmendments: 3,
      unresolvedArrivals: 4,
      urgentMaintenance: 5,
    }),
    21,
  );
});

test('night audit route and service enforce a protected immutable close', async () => {
  const [route, service, page, registry] = await Promise.all([
    readFile(new URL('../app/api/v1/partner/night-audit/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerNightAuditService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/night-audit/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /operationalDateVersion/);
  assert.match(service, /HOTEL_OPERATIONAL_DATE_CLOSED/);
  assert.match(service, /hotelPosOrder\.count/);
  assert.doesNotMatch(service, /hotelNightAuditClose\.(update|delete)/);
  assert.match(page, /Mandatory close checklist/);
  assert.match(page, /unfinished POS and kitchen orders/);
  assert.match(page, /append-only/);
  assert.match(registry, /href: '\/partner\/pms\/night-audit'/);
});

test('night audit schema and migrations preserve one close per property date', async () => {
  const [schema, sqliteMigration, postgresMigration] = await Promise.all([
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/migrations/20260907223000_add_hotel_night_audit/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260907223000_add_hotel_night_audit/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(schema, /model HotelNightAuditClose/);
  assert.match(schema, /@@unique\(\[propertyId, businessDate\]\)/);
  assert.match(schema, /operationalDateVersion\s+Int\s+@default\(0\)/);
  assert.match(sqliteMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /HotelNightAuditClose_propertyId_businessDate_key/);
});
