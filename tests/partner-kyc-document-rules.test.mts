import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPartnerKycObjectKey,
  effectivePartnerKycStatus,
  evaluatePartnerKycTransition,
  normalizePartnerKycMetadata,
  partnerKycAccessRule,
  partnerKycDocumentPolicy,
  partnerKycRetentionRule,
  requiredPartnerKycDocuments,
  validatePartnerKycDocumentDates,
} from '../lib/partner/kycDocumentRules.ts';

test('partner types receive shared and inventory-specific evidence requirements', () => {
  assert.ok(requiredPartnerKycDocuments('HOTEL').includes('HOTEL_OPERATING_LICENCE'));
  assert.ok(requiredPartnerKycDocuments('BUS').includes('VEHICLE_PERMIT'));
  assert.ok(requiredPartnerKycDocuments('CAR').includes('DRIVER_LICENCE'));
  assert.equal(partnerKycDocumentPolicy('HOTEL_OPERATING_LICENCE').allowedPartnerTypes[0], 'HOTEL');
});

test('metadata accepts only bounded content with a digest and path-safe display filename', () => {
  const valid = normalizePartnerKycMetadata({
    byteSize: 2_048,
    contentType: 'application/pdf',
    originalFilename: 'GST certificate.pdf',
    sha256: 'a'.repeat(64),
  });
  assert.equal(valid.ok, true);
  assert.equal(
    normalizePartnerKycMetadata({
      byteSize: 12 * 1024 * 1024,
      contentType: 'text/html',
      originalFilename: '../identity.html',
      sha256: 'unsafe',
    }).ok,
    false,
  );
});

test('object keys are server-shaped and reject traversal or invalid versions', () => {
  assert.equal(
    buildPartnerKycObjectKey({
      documentId: 'doc_123',
      extension: 'pdf',
      partnerId: 'partner_456',
      uploadId: 'upload_789',
      version: 2,
    }),
    'partners/partner_456/kyc/doc_123/v2/upload_789.pdf',
  );
  assert.equal(
    buildPartnerKycObjectKey({
      documentId: '../doc',
      extension: 'pdf',
      partnerId: 'partner_456',
      uploadId: 'upload_789',
      version: 1,
    }),
    undefined,
  );
});

test('expiry rules distinguish permanent and renewable evidence', () => {
  assert.equal(
    validatePartnerKycDocumentDates({
      documentType: 'PAN',
      expiresOn: '2030-01-01',
      issuedOn: '2020-01-01',
      today: '2026-08-26',
    }).ok,
    false,
  );
  assert.equal(
    validatePartnerKycDocumentDates({
      documentType: 'VEHICLE_INSURANCE',
      expiresOn: null,
      issuedOn: '2026-01-01',
      today: '2026-08-26',
    }).ok,
    false,
  );
  assert.equal(
    validatePartnerKycDocumentDates({
      documentType: 'VEHICLE_INSURANCE',
      expiresOn: '2027-01-01',
      issuedOn: '2026-01-01',
      today: '2026-08-26',
    }).ok,
    true,
  );
});

test('review lifecycle is optimistic, reasoned, and rejects stale or invalid transitions', () => {
  const verified = evaluatePartnerKycTransition({
    currentVersion: 3,
    expectedVersion: 3,
    expiresOn: '2027-01-01',
    from: 'UNDER_REVIEW',
    reviewerUserId: 'admin_123',
    reviewNote: 'Verified against the approved evidence checklist.',
    to: 'VERIFIED',
    today: '2026-08-26',
  });
  assert.deepEqual(verified, {
    ok: true,
    value: {
      nextVersion: 4,
      reviewNote: 'Verified against the approved evidence checklist.',
    },
  });
  assert.equal(
    evaluatePartnerKycTransition({
      currentVersion: 3,
      expectedVersion: 2,
      from: 'UNDER_REVIEW',
      reviewerUserId: 'admin_123',
      reviewNote: 'no',
      to: 'REJECTED',
      today: '2026-08-26',
    }).ok,
    false,
  );
  assert.equal(
    evaluatePartnerKycTransition({
      currentVersion: 3,
      expectedVersion: 3,
      from: 'VERIFIED',
      reviewerUserId: 'admin_123',
      to: 'UNDER_REVIEW',
      today: '2026-08-26',
    }).ok,
    false,
  );
});

test('verified evidence expires deterministically and deletion never bypasses review', () => {
  assert.equal(
    effectivePartnerKycStatus({
      expiresOn: '2026-08-26',
      status: 'VERIFIED',
      today: '2026-08-26',
    }),
    'EXPIRED',
  );
  assert.deepEqual(partnerKycRetentionRule('GST_REGISTRATION'), {
    automaticDeletionAllowed: false,
    legalHoldEligible: true,
    retentionClass: 'TAX_AND_FINANCE',
    reviewRequiredBeforeDeletion: true,
  });
  assert.equal(partnerKycAccessRule('PAN').publicAccess, false);
  assert.equal(partnerKycAccessRule('PAN').downloadableByPartnerMember, false);
  assert.deepEqual(partnerKycAccessRule('PAN').permittedRoles, ['KYC_REVIEWER', 'PLATFORM_ADMIN']);
});
