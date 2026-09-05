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
  const [route, service] = await Promise.all([
    readFile(
      new URL(
        '../app/api/v1/admin/partners/[partnerId]/vehicles/[vehicleId]/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /getPlatformAdmin/);
  assert.match(service, /partnerAuditLog\.create/);
  assert.match(route, /evaluateVehicleReview/);
  assert.match(route, /riskSignal\.count/);
});

test('admin listing editors are stale-write protected, re-risked, audited, and returned to review', async () => {
  const [propertyRoute, vehicleRoute, propertyEditor, vehicleEditor, service] = await Promise.all([
    readFile(
      new URL(
        '../app/api/v1/admin/partners/[partnerId]/properties/[propertyId]/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../app/api/v1/admin/partners/[partnerId]/vehicles/[vehicleId]/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../components/admin/AdminPropertyListingEditor.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../components/admin/AdminVehicleListingEditor.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
  ]);
  for (const route of [propertyRoute, vehicleRoute]) {
    assert.match(route, /isSameOriginMutation/);
    assert.match(route, /getPlatformAdmin/);
    assert.match(route, /UPDATE_LISTING/);
    assert.match(route, /expectedUpdatedAt/);
  }
  for (const editor of [propertyEditor, vehicleEditor]) {
    assert.match(editor, /expectedUpdatedAt/);
    assert.match(editor, /Save and return to review/);
  }
  assert.match(service, /LISTING_CHANGED/);
  assert.match(service, /approvalStatus: 'PENDING_REVIEW'/);
  assert.match(service, /publicationStatus: 'DRAFT'/);
  assert.match(service, /SUPPLIER_LISTING_RULES_V1/);
  assert.match(service, /PROPERTY_LISTING_ADMIN_UPDATED/);
  assert.match(service, /VEHICLE_LISTING_ADMIN_UPDATED/);
});

test('paid enrollment is persistent, fixed-price and reconciled server-side', async () => {
  const [checkout, enrollment, callback, webhook] = await Promise.all([
    readFile(
      new URL('../app/api/v1/partners/onboarding/checkout/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../services/partnerEnrollmentService.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../app/api/v1/partners/onboarding/payu/return/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/api/v1/payments/webhooks/[provider]/route.ts', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(checkout, /isSameOriginMutation/);
  assert.match(checkout, /PAID_PARTNER_ONBOARDING/);
  assert.match(enrollment, /quote\.dueNow \/ 100/);
  assert.match(enrollment, /verified\.amount \* 100 === order\.dueNowAmount/);
  assert.match(enrollment, /status: \{ in: \['CAPTURED', 'WAIVED'\] \}/);
  assert.match(callback, /reconcilePartnerOnboardingPayment/);
  assert.doesNotMatch(callback, /searchParams\.get\('outcome'\)/);
  assert.match(webhook, /verifyPayuResponseHash/);
  assert.match(webhook, /reconcilePartnerOnboardingPayment/);
});

test('agreement evidence and launch coupons are bounded and attributable', async () => {
  const [acceptance, coupons, schema] = await Promise.all([
    readFile(
      new URL('../app/api/v1/partners/onboarding/agreements/accept/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/api/v1/admin/partners/onboarding/coupons/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
  ]);
  assert.match(acceptance, /explicitAcceptance !== true/);
  assert.match(acceptance, /phoneVerificationRef/);
  assert.match(coupons, /getPlatformAdmin/);
  assert.match(coupons, /isSameOriginMutation/);
  assert.match(coupons, /createdByUserId: admin\.id/);
  assert.match(schema, /model PartnerAgreementAcceptance/);
  assert.match(schema, /model PartnerOnboardingOrder/);
  assert.match(schema, /idempotencyKey\s+String\s+@unique/);
});
