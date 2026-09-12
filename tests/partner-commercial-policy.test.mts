import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculatePartnerBookingFee,
  pmsRoomTier,
  quotePmsSubscription,
} from '../lib/finance/partnerCommercialPolicy.ts';

test('PMS room tiers, free trial, half-price period, and annual discount are deterministic', () => {
  assert.equal(pmsRoomTier(10)?.monthlyAmountPaise, 199_900);
  assert.equal(pmsRoomTier(11)?.monthlyAmountPaise, 299_900);
  assert.equal(pmsRoomTier(100)?.monthlyAmountPaise, 899_900);
  assert.equal(pmsRoomTier(101), null);
  assert.equal(quotePmsSubscription({ monthsSinceActivation: 0, roomCount: 10 }).amountPaise, 0);
  assert.equal(
    quotePmsSubscription({ monthsSinceActivation: 6, roomCount: 10 }).amountPaise,
    99_950,
  );
  assert.throws(
    () => quotePmsSubscription({ billingMonths: 12, monthsSinceActivation: 6, roomCount: 10 }),
    /standard-rate period/,
  );
  assert.equal(
    quotePmsSubscription({ billingMonths: 12, monthsSinceActivation: 12, roomCount: 10 })
      .amountPaise,
    1_999_000,
  );
});

test('booking fees are source-specific, GST-inclusive, and enforce minimums', () => {
  assert.deepEqual(
    calculatePartnerBookingFee({ bookingValueRupees: 1_000, source: 'EXTERNAL_OTA' }),
    {
      basisPoints: 0,
      feeGstRupees: 0,
      grossFeeRupees: 0,
      minimumFeeRupees: 0,
      policyVersion: 'IN-PARTNER-COMMERCIAL-2026-09-13-v1',
      source: 'EXTERNAL_OTA',
      taxableFeeRupees: 0,
    },
  );
  assert.equal(
    calculatePartnerBookingFee({ bookingValueRupees: 10_000, source: 'MANDYAL_MARKETPLACE' })
      .grossFeeRupees,
    1_800,
  );
  assert.equal(
    calculatePartnerBookingFee({ bookingValueRupees: 500, source: 'PMS_DIRECT_ONLINE' })
      .grossFeeRupees,
    99,
  );
  assert.equal(
    calculatePartnerBookingFee({ bookingValueRupees: 500, source: 'PMS_DIRECT_OFFLINE' })
      .grossFeeRupees,
    49,
  );
});
