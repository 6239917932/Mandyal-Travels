import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  agreementForPartnerType,
  PARTNER_AGREEMENTS,
  PARTNER_AGREEMENT_VERSION,
  readPartnerApplicationAcknowledgements,
} from '../lib/partner/partnerAgreementPolicy.ts';

test('every retained supplier agreement has a versioned document with the declared hash', async () => {
  assert.match(PARTNER_AGREEMENT_VERSION, /^\d+\.\d+$/);
  for (const type of ['HOTEL', 'CAR', 'BUS'] as const) {
    const agreement = agreementForPartnerType(type);
    assert.equal(agreement, PARTNER_AGREEMENTS[type]);
    assert.match(agreement?.documentPath ?? '', /^\/legal\/partner-agreements\/.+\.docx$/);
    assert.match(agreement?.contentSha256 ?? '', /^[a-f0-9]{64}$/);
    assert.match(agreement?.version ?? '', /^\d+\.\d+$/);
    const bytes = await readFile(`public${agreement!.documentPath}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), agreement?.contentSha256);
  }
  assert.equal(agreementForPartnerType('FLIGHT'), null);
  assert.equal(PARTNER_AGREEMENTS.HOTEL.version, PARTNER_AGREEMENT_VERSION);
});

test('all agreement and compliance acknowledgements are mandatory', () => {
  const complete = {
    ackAgreement: 'on',
    ackApprovalGate: 'on',
    ackAuthority: 'on',
    ackElectronicDelivery: 'on',
    ackIdentity: 'on',
    ackMaterialChanges: 'on',
    ackOperatingRecords: 'on',
    ackServiceResponsibility: 'on',
    ackSignedReturn: 'on',
  };
  assert.ok(readPartnerApplicationAcknowledgements(complete));
  assert.equal(readPartnerApplicationAcknowledgements({ ...complete, ackIdentity: 'off' }), null);
});

test('legacy applications cannot be emailed as though they accepted the current agreement', async () => {
  const service = await readFile('services/partnerAgreementEmailService.ts', 'utf8');
  assert.match(service, /!application\.agreementVersion/);
  assert.match(service, /!application\.agreementDocumentPath/);
  assert.match(service, /!application\.agreementContentHash/);
});

test('public partner applications remain hotel-only and record the exact electronic acceptance', async () => {
  const [route, service] = await Promise.all([
    readFile('app/api/v1/partners/applications/route.ts', 'utf8'),
    readFile('services/partnerOperationsService.ts', 'utf8'),
  ]);
  assert.match(route, /body\.partnerType !== 'HOTEL'/);
  assert.match(route, /Car and bus partner onboarding are coming soon/);
  assert.match(service, /agreementAcceptedAt: new Date\(\)/);
  assert.match(service, /signedAgreementStatus: 'ELECTRONIC_ACCEPTED'/);
  assert.match(service, /PARTNER_AGREEMENTS\[input\.partnerType/);
});
