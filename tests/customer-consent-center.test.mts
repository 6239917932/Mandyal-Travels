import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_CONSENT_MAX_PAGE,
  CUSTOMER_CONSENT_PAGE_SIZE,
  CUSTOMER_CONSENT_RESULT_LIMIT,
  customerConsentCurrentPosture,
  customerConsentHistoryWhere,
  customerConsentPath,
  customerConsentPolicyEvidence,
  customerConsentPurpose,
  customerConsentSource,
  customerConsentStatus,
  normalizeCustomerConsentFilters,
} from '../services/customerConsentCenterService.ts';

test('customer consent filters are closed and strictly bounded', () => {
  assert.deepEqual(normalizeCustomerConsentFilters({ page: '3', status: 'withdrawn' }), {
    page: 3,
    status: 'WITHDRAWN',
  });
  assert.deepEqual(
    normalizeCustomerConsentFilters({ page: ['999', '2'], status: ['ERASED', 'GRANTED'] }),
    { page: CUSTOMER_CONSENT_MAX_PAGE, status: 'ALL' },
  );
  assert.deepEqual(normalizeCustomerConsentFilters({ page: '-2', status: '' }), {
    page: 1,
    status: 'ALL',
  });
  assert.equal(CUSTOMER_CONSENT_PAGE_SIZE, 20);
  assert.equal(CUSTOMER_CONSENT_RESULT_LIMIT, 500);
});

test('customer consent query helpers preserve exact account scope and stable filters', () => {
  assert.deepEqual(customerConsentHistoryWhere('signed-in-user', 'ALL'), {
    userId: 'signed-in-user',
  });
  assert.deepEqual(customerConsentHistoryWhere('signed-in-user', 'GRANTED'), {
    status: 'GRANTED',
    userId: 'signed-in-user',
  });
  assert.equal(
    customerConsentPath({ page: 4, status: 'WITHDRAWN' }, 2),
    '/account/consents?page=2&status=WITHDRAWN',
  );
});

test('unknown internal consent values are never echoed to customers', () => {
  assert.equal(customerConsentPurpose('SECRET_INTERNAL_PURPOSE'), 'Recorded consent');
  assert.equal(customerConsentSource('BATCH_BACKFILL_42'), 'Account record');
  assert.deepEqual(customerConsentStatus('UNKNOWN_STATE'), {
    label: 'Requires review',
    tone: 'attention',
  });
  assert.equal(customerConsentCurrentPosture(null), null);
});

test('policy evidence is bounded and identifies pending legal approval honestly', () => {
  assert.deepEqual(customerConsentPolicyEvidence('privacy-v2.1-pending-legal-approval'), {
    label: 'privacy-v2.1-pending-legal-approval',
    pendingLegalApproval: true,
  });
  assert.deepEqual(customerConsentPolicyEvidence('\u0000  privacy-v1  '), {
    label: 'privacy-v1',
    pendingLegalApproval: false,
  });
  assert.equal(customerConsentPolicyEvidence('x'.repeat(200)).label.length, 80);
});

test('consent history is session protected, user scoped, minimal, bounded, and read-only', async () => {
  const page = await readFile(new URL('../app/account/consents/page.tsx', import.meta.url), 'utf8');
  const loading = await readFile(
    new URL('../app/account/consents/loading.tsx', import.meta.url),
    'utf8',
  );
  const error = await readFile(
    new URL('../app/account/consents/error.tsx', import.meta.url),
    'utf8',
  );

  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /redirect\('\/login\?returnTo=%2Faccount%2Fconsents'\)/);
  assert.match(page, /customerConsentHistoryWhere\(user\.id, filters\.status\)/);
  assert.match(page, /where: \{ status: 'GRANTED', userId: user\.id \}/);
  assert.match(page, /where: \{ purpose: 'MARKETING_COMMUNICATIONS', userId: user\.id \}/);
  assert.match(page, /take: CUSTOMER_CONSENT_PAGE_SIZE/);
  assert.match(page, /policyVersion: true/);
  assert.match(page, /withdrawnAt: true/);
  assert.match(page, /No permission or withdrawal is inferred/);
  assert.match(page, /This page is read-only/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /No consent, communication preference, or account record was changed/);

  for (const prohibited of [
    'id: true',
    'userId: true',
    'email: true',
    '.create(',
    '.createMany(',
    '.update(',
    '.updateMany(',
    '.delete(',
    '.deleteMany(',
    'Cashfree',
  ]) {
    assert.doesNotMatch(page, new RegExp(prohibited.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
