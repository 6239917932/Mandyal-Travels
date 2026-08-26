import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsPercent,
  buildOperationalAnalyticsSnapshot,
  buildPartnerPerformanceRows,
  formatAnalyticsCurrency,
  formatAnalyticsPercent,
} from '../services/platformAnalyticsService.ts';

test('operational analytics calculate explicit ratios and combined support load', () => {
  assert.deepEqual(
    buildOperationalAnalyticsSnapshot({
      activeSuppliers: 8,
      capturedCheckoutIntents: 7,
      confirmedFunnelEvents: 25,
      highRiskSignals: 2,
      hotelBookings: 20,
      hotelCancellations: 3,
      openBusinessSupportCases: 4,
      openCustomerSupportCases: 6,
      publishedHotelProperties: 9,
      searchFunnelEvents: 100,
      totalCheckoutIntents: 10,
      totalHotelProperties: 12,
      totalSuppliers: 10,
    }),
    {
      activeSupplierPercent: 80,
      activeSuppliers: 8,
      capturedCheckoutIntents: 7,
      capturedCheckoutPercent: 70,
      confirmedFunnelEvents: 25,
      highRiskSignals: 2,
      hotelBookings: 20,
      hotelCancellationPercent: 15,
      hotelCancellations: 3,
      openBusinessSupportCases: 4,
      openCustomerSupportCases: 6,
      openSupportCases: 10,
      publishedHotelPercent: 75,
      publishedHotelProperties: 9,
      searchFunnelEvents: 100,
      totalCheckoutIntents: 10,
      totalHotelProperties: 12,
      totalSuppliers: 10,
      trackedConversionPercent: 25,
    },
  );
});

test('operational analytics display empty denominators honestly', () => {
  assert.equal(analyticsPercent(0, 0), null);
  assert.equal(formatAnalyticsPercent(null), 'Not enough data');
  assert.equal(formatAnalyticsPercent(12.34), '12.34%');
});

test('partner analytics calculate only persisted settlement performance', () => {
  assert.deepEqual(
    buildPartnerPerformanceRows(
      [
        {
          bookingCount: 6,
          commissionAmount: 1200,
          grossAmount: 12000,
          netAmount: 10800,
          partnerId: 'partner-one',
          settlementCount: 2,
        },
      ],
      [{ id: 'partner-one', name: 'Himalayan Stays', status: 'ACTIVE', type: 'HOTEL' }],
    ),
    [
      {
        bookingCount: 6,
        commissionAmount: 1200,
        commissionPercent: 10,
        grossAmount: 12000,
        name: 'Himalayan Stays',
        netAmount: 10800,
        partnerId: 'partner-one',
        settlementCount: 2,
        status: 'ACTIVE',
        type: 'HOTEL',
      },
    ],
  );
  assert.equal(formatAnalyticsCurrency(10800), '₹10,800');
});

test('partner analytics fail safe for malformed aggregates and missing identities', () => {
  const [row] = buildPartnerPerformanceRows(
    [
      {
        bookingCount: -1,
        commissionAmount: Number.NaN,
        grossAmount: null,
        netAmount: -500,
        partnerId: 'missing-partner',
        settlementCount: 1.5,
      },
    ],
    [],
  );

  assert.deepEqual(row, {
    bookingCount: 0,
    commissionAmount: 0,
    commissionPercent: null,
    grossAmount: 0,
    name: 'Partner record',
    netAmount: 0,
    partnerId: 'missing-partner',
    settlementCount: 0,
    status: 'UNKNOWN',
    type: 'UNKNOWN',
  });
});
