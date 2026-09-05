import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { evaluateVehicleReview } from '../lib/car/vehicleApproval.ts';
import {
  onboardingCanAdvance,
  quotePartnerOnboarding,
} from '../lib/partner/onboardingCommercialRules.ts';
import {
  evaluatePropertyListingRisk,
  evaluateVehicleListingRisk,
  vehicleMayBePublished,
} from '../lib/partner/listingRiskRules.ts';

test('supplier commercial quote is server-owned and supports an explicit zero-value waiver', () => {
  const paid = quotePartnerOnboarding();
  assert.equal(paid.oneTimeSetupAmount, 2_500_000);
  assert.equal(paid.monthlySubscriptionAmount, 99_900);
  assert.equal(paid.dueNow, 2_599_900);
  const waived = quotePartnerOnboarding({
    approvedWaiverCodes: new Set(['LAUNCH100']),
    couponCode: 'launch100',
  });
  assert.equal(waived.dueNow, 0);
  assert.equal(waived.discountAmount, 2_599_900);
  assert.equal(waived.waived, true);
});

test('payment or waiver never bypasses agreement and phone verification', () => {
  assert.equal(
    onboardingCanAdvance({
      agreementAccepted: true,
      paymentStatus: 'PAID',
      phoneOtpVerified: true,
    }),
    true,
  );
  assert.equal(
    onboardingCanAdvance({
      agreementAccepted: true,
      paymentStatus: 'WAIVED',
      phoneOtpVerified: false,
    }),
    false,
  );
  assert.equal(
    onboardingCanAdvance({
      agreementAccepted: false,
      paymentStatus: 'PAID',
      phoneOtpVerified: true,
    }),
    false,
  );
});

test('direct vehicles require three independent public states', () => {
  assert.equal(
    vehicleMayBePublished({
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      status: 'ACTIVE',
    }),
    true,
  );
  assert.equal(
    vehicleMayBePublished({
      approvalStatus: 'PENDING_REVIEW',
      publicationStatus: 'PUBLISHED',
      status: 'ACTIVE',
    }),
    false,
  );
  assert.equal(
    vehicleMayBePublished({
      approvalStatus: 'APPROVED',
      publicationStatus: 'DRAFT',
      status: 'ACTIVE',
    }),
    false,
  );
});

test('vehicle review blocks missing compliance and unresolved high-risk evidence', () => {
  assert.equal(
    evaluateVehicleReview({
      action: 'APPROVE',
      approvalStatus: 'PENDING_REVIEW',
      complianceState: 'CURRENT',
      hasRegistrationNumber: true,
      openHighRiskSignals: 1,
      reviewNote: '',
    }).valid,
    false,
  );
  assert.equal(
    evaluateVehicleReview({
      action: 'APPROVE',
      approvalStatus: 'PENDING_REVIEW',
      complianceState: 'INCOMPLETE',
      hasRegistrationNumber: true,
      openHighRiskSignals: 0,
      reviewNote: '',
    }).valid,
    false,
  );
  assert.equal(
    evaluateVehicleReview({
      action: 'APPROVE',
      approvalStatus: 'PENDING_REVIEW',
      complianceState: 'CURRENT',
      hasRegistrationNumber: true,
      openHighRiskSignals: 0,
      reviewNote: '',
    }).valid,
    true,
  );
});

test('listing risk rules flag identity, address, image and pricing concerns for human review', () => {
  const vehicleCodes = evaluateVehicleListingRisk({
    cancellationPolicy: 'Guaranteed refund',
    dropoffLocation: 'Mandi',
    pickupLocation: 'Mandi',
    pricePerDay: 300,
    registrationNumber: null,
    totalUnits: 80,
    vehicleName: 'Official taxi',
  }).map((finding) => finding.code);
  assert.ok(vehicleCodes.includes('VEHICLE_REGISTRATION_MISSING'));
  assert.ok(vehicleCodes.includes('VEHICLE_PRICE_OUTLIER_LOW'));
  const propertyCodes = evaluatePropertyListingRisk({
    description: 'The best in India and guaranteed safe place to stay.',
    displayName: 'Official Hotel',
    imageUrl: 'https://images.unsplash.com/x',
    latitude: 0,
    longitude: 0,
    streetAddress: 'Mandi',
  }).map((finding) => finding.code);
  assert.ok(propertyCodes.includes('PROPERTY_COORDINATES_MISSING'));
  assert.ok(propertyCodes.includes('PROPERTY_IMAGE_NOT_VERIFIED'));
});

test('admin vehicle mutation is authenticated, same-origin, audited and recoverable', async () => {
  const route = await readFile(
    new URL(
      '../app/api/v1/admin/partners/[partnerId]/vehicles/[vehicleId]/route.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /getPlatformAdmin/);
  assert.match(route, /partnerAuditLog\.create/);
  assert.match(route, /evaluateVehicleReview/);
  assert.match(route, /riskSignal\.count/);
});
