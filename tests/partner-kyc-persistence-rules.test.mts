import assert from 'node:assert/strict';
import test from 'node:test';

import {
  partnerKycStorageReadiness,
  publicPartnerKycProjection,
  summarizePersistedPartnerKyc,
} from '../lib/partner/kycPersistenceRules.ts';

test('approval checklist requires every partner-specific document to be verified and current', () => {
  const required = [
    'BUSINESS_REGISTRATION',
    'PAN',
    'GST_REGISTRATION',
    'REGISTERED_ADDRESS_PROOF',
    'AUTHORIZED_REPRESENTATIVE_ID',
    'BANK_ACCOUNT_PROOF',
    'PARTNER_CONTRACT',
    'HOTEL_OPERATING_LICENCE',
  ];
  const complete = summarizePersistedPartnerKyc({
    documents: required.map((documentType) => ({
      documentType,
      expiresOn: documentType === 'HOTEL_OPERATING_LICENCE' ? '2027-08-26' : null,
      status: 'VERIFIED',
    })),
    partnerType: 'HOTEL',
    today: '2026-08-26',
  });
  assert.equal(complete.complete, true);
  assert.equal(complete.verified.length, required.length);

  const expired = summarizePersistedPartnerKyc({
    documents: required.map((documentType) => ({
      documentType,
      expiresOn: documentType === 'HOTEL_OPERATING_LICENCE' ? '2026-08-26' : null,
      status: 'VERIFIED',
    })),
    partnerType: 'HOTEL',
    today: '2026-08-26',
  });
  assert.equal(expired.complete, false);
  assert.deepEqual(expired.expired, ['HOTEL_OPERATING_LICENCE']);
});

test('private evidence storage remains fail closed until the reviewed adapter exists', () => {
  assert.deepEqual(
    partnerKycStorageReadiness({
      signingApiKey: 'partial-secret',
      signingEndpoint: 'https://unreviewed.example.test',
    }),
    { code: 'KYC_STORAGE_NOT_CONFIGURED', ready: false },
  );
});

test('partner projection excludes object keys, digests, and provider details', () => {
  const projection = publicPartnerKycProjection({
    documentType: 'PAN',
    expiresOn: null,
    fileVersion: 2,
    issuedOn: '2020-01-01',
    lockVersion: 5,
    reviewNote: 'Verified against approved evidence controls.',
    status: 'VERIFIED',
    versions: [
      {
        byteSize: 1024,
        contentType: 'application/pdf',
        originalFilename: 'PAN.pdf',
        storageStatus: 'SCAN_PASSED',
      },
    ],
  });
  assert.equal(projection.originalFilename, 'PAN.pdf');
  assert.equal('objectKey' in projection, false);
  assert.equal('sha256' in projection, false);
  assert.equal('uploadUrl' in projection, false);
});
