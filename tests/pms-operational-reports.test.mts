import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildHotelOperationalReport,
  HotelOperationalReportRuleError,
  normalizeHotelOperationalReportRange,
} from '../lib/pms/operationalReport.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('operational report range defaults to seven days and rejects malformed or excessive periods', () => {
  assert.deepEqual(normalizeHotelOperationalReportRange({ defaultThrough: '2026-09-08' }), {
    days: 7,
    dates: [
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
    ],
    from: '2026-09-02',
    through: '2026-09-08',
  });
  assert.throws(
    () =>
      normalizeHotelOperationalReportRange({ defaultThrough: '2026-09-08', from: '08/09/2026' }),
    HotelOperationalReportRuleError,
  );
  assert.throws(
    () =>
      normalizeHotelOperationalReportRange({
        defaultThrough: '2026-09-08',
        from: '2025-01-01',
        through: '2026-09-08',
      }),
    /366 days or fewer/,
  );
});

test('operational report nets reversals and reconciles services, shifts and Night Audit by date', () => {
  const report = buildHotelOperationalReport({
    bookings: [{ checkInDate: '2026-09-07', checkOutDate: '2026-09-08', rooms: 2 }],
    closes: [{ businessDate: '2026-09-07' }],
    dates: ['2026-09-07', '2026-09-08'],
    folioEntries: [
      { amount: 1000, businessDate: '2026-09-07', category: 'ROOM', entryType: 'CHARGE' },
      {
        amount: 100,
        businessDate: '2026-09-07',
        category: 'ROOM',
        entryType: 'REVERSAL',
        reversalOfType: 'CHARGE',
      },
      { amount: 600, businessDate: '2026-09-07', category: 'CASH', entryType: 'PAYMENT' },
      {
        amount: 50,
        businessDate: '2026-09-07',
        category: 'CASH',
        entryType: 'REVERSAL',
        reversalOfType: 'PAYMENT',
      },
    ],
    serviceOrders: [
      { businessDate: '2026-09-07', serviceMode: 'LAUNDRY', status: 'POSTED', totalAmount: 250 },
      {
        businessDate: '2026-09-07',
        serviceMode: 'ROOM_SERVICE',
        status: 'CANCELLED',
        totalAmount: 400,
      },
    ],
    shifts: [
      { businessDate: '2026-09-07', status: 'OPEN' },
      { businessDate: '2026-09-07', status: 'CLOSED' },
    ],
  });
  assert.deepEqual(report.rows[0], {
    arrivals: 2,
    businessDate: '2026-09-07',
    cashCollections: 550,
    closedCashierShifts: 1,
    departures: 0,
    folioCharges: 900,
    folioPayments: 550,
    laundryAndMinibarValue: 250,
    nightAuditClosed: true,
    openCashierShifts: 1,
    postedServiceOrders: 1,
    serviceOrderValue: 250,
  });
  assert.equal(report.rows[1]?.departures, 2);
  assert.equal(report.totals.folioCharges, 900);
  assert.equal(report.totals.folioPayments, 550);
});

test('operational reporting is admin-only, tenant scoped, bounded and fail-closed for export', () => {
  const service = read('services/partnerHotelReportingService.ts');
  const route = read('app/api/v1/partner/pms-reports/route.ts');
  const page = read('app/partner/pms/reports/page.tsx');
  assert.match(service, /memberRole !== 'ADMIN'/);
  assert.match(service, /listingSource: 'MANAGED', partnerId, status: 'ACTIVE'/);
  assert.match(service, /propertyId: selected\.id/);
  assert.match(service, /MAX_ACTIVITY_ROWS = 5_000/);
  assert.match(service, /financialComplete: !safetyLimitReached && !currencyConflict/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(route, /INCOMPLETE_REPORT/);
  assert.match(route, /Cache-Control': 'private, no-store'/);
  assert.match(route, /createCsv/);
  assert.match(page, /recognized accounting revenue, a GST/);
});
