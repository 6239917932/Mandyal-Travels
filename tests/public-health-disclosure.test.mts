import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile('app/api/v1/health/route.ts', 'utf8');

test('public readiness health returns only generic dependency posture', () => {
  assert.match(route, /dependencies: dependencyStatus/);
  assert.doesNotMatch(route, /integrations:\s*{/);
  assert.doesNotMatch(route, /hotelbedsContent: hotelbeds/);
  assert.doesNotMatch(route, /pendingCount,/);
  assert.doesNotMatch(route, /deadLetterCount,/);
  assert.match(route, /partnerOnboardingCouponEvent\.findFirst/);
  assert.match(route, /partnerAgreementRelease\.findFirst/);
  assert.match(route, /emailOtpChallenge\.findFirst/);
  assert.match(route, /partnerPayoutAccountEvent\.findFirst/);
});
