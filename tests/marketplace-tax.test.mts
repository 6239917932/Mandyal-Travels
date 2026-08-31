import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MARKETPLACE_TAX_RULE,
  calculateMarketplaceHotelTax,
} from '../lib/finance/marketplaceTax.ts';

test('registered hotel pricing keeps the vendor base and separates tax credits', () => {
  const result = calculateMarketplaceHotelTax({
    profile: {
      gstRegistrationStatus: 'REGISTERED',
      section194OExempt: false,
      section9FiveApplicable: false,
    },
    vendorBaseAmount: 1_000,
    vendorNightlyBaseAmount: 1_000,
  });

  assert.deepEqual(result, {
    commissionGstAmount: 38,
    commissionGrossAmount: 250,
    commissionTaxableAmount: 212,
    customerTaxableAmount: 1_250,
    customerTotalAmount: 1_400,
    ecoGstLiabilityAmount: 0,
    gatewayFeeAmount: 27,
    gatewayFeeGstAmount: 5,
    gstTcsAmount: 6,
    hotelGstAmount: 150,
    hotelGstBasisPoints: 1_200,
    incomeTaxTdsAmount: 1,
    platformContributionAmount: 180,
    ruleVersion: MARKETPLACE_TAX_RULE.version,
    vendorBaseAmount: 1_000,
    vendorGrossAmount: 1_150,
    vendorSettlementAmount: 1_143,
  });
});

test('unregistered Section 9(5) hotel assigns service GST to the platform', () => {
  const result = calculateMarketplaceHotelTax({
    profile: {
      gstRegistrationStatus: 'UNREGISTERED',
      section194OExempt: true,
      section9FiveApplicable: true,
    },
    vendorBaseAmount: 1_000,
    vendorNightlyBaseAmount: 1_000,
  });

  assert.equal(result.customerTotalAmount, 1_400);
  assert.equal(result.ecoGstLiabilityAmount, 150);
  assert.equal(result.gstTcsAmount, 0);
  assert.equal(result.incomeTaxTdsAmount, 0);
  assert.equal(result.vendorSettlementAmount, 1_000);
});

test('unregistered hotels are blocked until Section 9(5) is reviewed', () => {
  assert.throws(
    () =>
      calculateMarketplaceHotelTax({
        profile: {
          gstRegistrationStatus: 'UNREGISTERED',
          section194OExempt: false,
          section9FiveApplicable: false,
        },
        vendorBaseAmount: 1_000,
        vendorNightlyBaseAmount: 1_000,
      }),
    /Section 9\(5\)/,
  );
});

test('hotel GST moves to 18 percent when the public nightly value exceeds the threshold', () => {
  const result = calculateMarketplaceHotelTax({
    profile: {
      gstRegistrationStatus: 'REGISTERED',
      section194OExempt: true,
      section9FiveApplicable: false,
    },
    vendorBaseAmount: 6_001,
    vendorNightlyBaseAmount: 6_001,
  });
  assert.equal(result.customerTaxableAmount, 7_502);
  assert.equal(result.hotelGstBasisPoints, 1_800);
});

test('marketplace publication and live checkout remain independently gated', () => {
  const hotelRepository = readFileSync('repositories/hotelRepository.ts', 'utf8');
  const checkoutRoute = readFileSync('app/api/v1/payments/checkout-intents/route.ts', 'utf8');
  assert.match(hotelRepository, /isPlatformFeatureEnabled\('PUBLIC_PARTNER_LISTINGS'\)/);
  assert.match(checkoutRoute, /isPlatformFeatureEnabled\('LIVE_MARKETPLACE_PAYMENTS'\)/);
  assert.match(checkoutRoute, /LIVE_PAYMENTS_NOT_APPROVED/);
});

test('tax-profile approval is admin-only, same-origin, versioned, and audited', () => {
  const route = readFileSync('app/api/v1/admin/partners/[partnerId]/tax-profile/route.ts', 'utf8');
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /getPlatformAdmin\(\)/);
  assert.match(route, /VERSION_CONFLICT/);
  assert.match(route, /partnerAuditLog\.create/);
});
