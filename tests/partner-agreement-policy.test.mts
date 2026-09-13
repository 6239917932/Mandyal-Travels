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

test('every supported supplier type has a versioned agreement document with the declared hash', async () => {
  assert.match(PARTNER_AGREEMENT_VERSION, /^\d+\.\d+$/);
  for (const type of ['HOTEL', 'CAR', 'BUS'] as const) {
    const agreement = agreementForPartnerType(type);
    assert.equal(agreement, PARTNER_AGREEMENTS[type]);
    assert.match(agreement?.documentPath ?? '', /^\/legal\/partner-agreements\/.+\.docx$/);
    assert.match(agreement?.contentSha256 ?? '', /^[a-f0-9]{64}$/);
    const bytes = await readFile(`public${agreement!.documentPath}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), agreement?.contentSha256);
  }
  assert.equal(agreementForPartnerType('FLIGHT'), null);
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
