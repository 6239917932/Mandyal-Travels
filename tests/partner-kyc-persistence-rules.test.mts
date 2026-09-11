import assert from 'node:assert/strict';
import test from 'node:test';

import {
  partnerKycStorageReadiness,
  publicPartnerKycProjection,
  summarizePersistedPartnerKyc,
} from '../lib/partner/kycPersistenceRules.ts';

test('approval checklist requires verified identity and signed contract', () => {
  const required = ['AUTHORIZED_REPRESENTATIVE_ID', 'PARTNER_CONTRACT'];
  const complete = summarizePersistedPartnerKyc({
    documents: required.map((documentType) => ({
      documentType,
      expiresOn: null,
      status: 'VERIFIED',
    })),
    partnerType: 'HOTEL',
    today: '2026-08-26',
  });
  assert.equal(complete.complete, true);
  assert.equal(complete.verified.length, required.length);

  const missing = summarizePersistedPartnerKyc({
    documents: required.slice(0, 1).map((documentType) => ({
      documentType,
      expiresOn: null,
      status: 'VERIFIED',
    })),
    partnerType: 'HOTEL',
    today: '2026-08-26',
  });
  assert.equal(missing.complete, false);
  assert.deepEqual(missing.missing, ['PARTNER_CONTRACT']);
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
