import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_SUPPORT_TIMELINE_LIMIT,
  customerSupportCategoryLabel,
  customerSupportEventLabel,
  customerSupportStatusLabel,
  normalizeCustomerSupportCaseNumber,
} from '../services/customerSupportCaseDetailRules.ts';

const serviceSource = await readFile(
  new URL('../services/customerSupportCaseDetailService.ts', import.meta.url),
  'utf8',
);
const pageSource = await readFile(
  new URL('../app/account/support/[caseNumber]/page.tsx', import.meta.url),
  'utf8',
);

test('support case identifiers are exact, bounded, and normalized', () => {
  assert.equal(
    normalizeCustomerSupportCaseNumber(' mtcc-20260824-a1b2c3d4 '),
    'MTCC-20260824-A1B2C3D4',
  );
  assert.equal(normalizeCustomerSupportCaseNumber('MTCC-20260824-A1B2C3D4-extra'), null);
  assert.equal(normalizeCustomerSupportCaseNumber('../MTCC-20260824-A1B2C3D4'), null);
});

test('customer labels use closed catalogues and unknown values fail safe', () => {
  assert.equal(customerSupportEventLabel('CREATED'), 'Case created');
  assert.equal(customerSupportEventLabel('CLOSED'), 'Case closed');
  assert.equal(customerSupportEventLabel('REOPENED'), 'Case reopened');
  assert.equal(customerSupportEventLabel('INTERNAL_NOTE_ADDED'), 'Update recorded');
  assert.equal(customerSupportCategoryLabel('PAYMENT'), 'Payment');
  assert.equal(customerSupportCategoryLabel('INTERNAL'), 'General support');
  assert.equal(customerSupportStatusLabel('OPEN'), 'Open');
  assert.equal(customerSupportStatusLabel('ESCALATED'), 'Under review');
});

test('detail lookup combines exact case ownership with a deterministic bounded timeline', () => {
  assert.equal(CUSTOMER_SUPPORT_TIMELINE_LIMIT, 100);
  assert.match(serviceSource, /where: \{ caseNumber: normalizedCaseNumber, userId \}/);
  assert.match(serviceSource, /orderBy: \[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/);
  assert.match(serviceSource, /take: CUSTOMER_SUPPORT_TIMELINE_LIMIT \+ 1/);
  assert.match(serviceSource, /slice\(0, CUSTOMER_SUPPORT_TIMELINE_LIMIT\)\.reverse\(\)/);
});

test('timeline projection excludes raw summaries and operator identities', () => {
  assert.doesNotMatch(serviceSource, /summary:\s*true/);
  assert.doesNotMatch(serviceSource, /actorUserId:\s*true/);
  assert.doesNotMatch(serviceSource, /reviewedByUserId:\s*true/);
  assert.doesNotMatch(pageSource, /event\.summary|actorUserId|reviewedByUserId/);
  assert.match(serviceSource, /resolutionNote: supportCase\.resolutionNote/);
});

test('customer support detail is authenticated, read-only, and ownership misses are opaque', () => {
  assert.match(pageSource, /getCurrentUser\(\)/);
  assert.match(pageSource, /if \(!supportCase\) notFound\(\)/);
  assert.doesNotMatch(pageSource, /fetch\(|method=|<form/);
});
