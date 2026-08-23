import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsPercent,
  buildOperationalAnalyticsSnapshot,
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
