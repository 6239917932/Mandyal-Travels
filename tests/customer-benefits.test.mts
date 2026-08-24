import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CUSTOMER_BENEFITS_LAUNCH_NOTICE,
  customerBenefitsAccountWhere,
  customerBenefitsReferralWhere,
  formatRecordedWalletUnits,
  formatSignedBenefitsUnits,
  publicReferralReadiness,
} from '../services/customerBenefitsService.ts';

test('customer benefits database filters are always scoped to the authenticated user', () => {
  assert.deepEqual(customerBenefitsAccountWhere(' user-42 '), { userId: 'user-42' });
  assert.deepEqual(customerBenefitsReferralWhere(' user-42 '), { ownerUserId: 'user-42' });
  assert.throws(() => customerBenefitsAccountWhere('  '), /authenticated user/);
});

test('customer benefits formatting rejects malformed persisted values', () => {
  assert.equal(formatRecordedWalletUnits(Number.NaN, 'INR'), 'Unavailable');
  assert.equal(formatRecordedWalletUnits(500, 'invalid'), 'Unavailable');
  assert.equal(formatRecordedWalletUnits(500, 'INR'), '500 INR units');
  assert.equal(formatSignedBenefitsUnits(25, 'points'), '+25 points');
  assert.equal(formatSignedBenefitsUnits(-10, 'wallet'), '-10 wallet units');
});

test('referral readiness never exposes a code or promises programme availability', () => {
  assert.match(CUSTOMER_BENEFITS_LAUNCH_NOTICE, /not launched/i);
  assert.match(CUSTOMER_BENEFITS_LAUNCH_NOTICE, /unavailable/i);
  assert.match(
    publicReferralReadiness({
      expiresAt: null,
    }),
    /code and rewards remain unavailable/i,
  );
});

test('customer benefits page is read-only, customer-scoped, and omits internal references', async () => {
  const page = await readFile(new URL('../app/account/benefits/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /customerBenefitsAccountWhere\(user\.id\)/);
  assert.match(page, /customerBenefitsReferralWhere\(user\.id\)/);
  assert.match(page, /user\.role !== 'CUSTOMER'/);
  assert.match(page, /Programme not launched/);
  assert.doesNotMatch(page, /referenceId|referenceType|referral\.code|description: true/);
  assert.doesNotMatch(page, /\.create\(|\.update\(|\.delete\(|\.upsert\(/);
});
