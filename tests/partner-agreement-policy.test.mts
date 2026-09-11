import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agreementForPartnerType,
  PARTNER_AGREEMENTS,
  PARTNER_AGREEMENT_VERSION,
  readPartnerApplicationAcknowledgements,
} from '../lib/partner/partnerAgreementPolicy.ts';

test('every supported supplier type has a versioned agreement document', () => {
  assert.match(PARTNER_AGREEMENT_VERSION, /^\d+\.\d+$/);
  for (const type of ['HOTEL', 'CAR', 'BUS'] as const) {
    const agreement = agreementForPartnerType(type);
    assert.equal(agreement, PARTNER_AGREEMENTS[type]);
    assert.match(agreement?.documentPath ?? '', /^\/legal\/partner-agreements\/.+\.docx$/);
    assert.match(agreement?.contentSha256 ?? '', /^[a-f0-9]{64}$/);
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
