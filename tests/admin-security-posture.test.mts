import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminSecurityPath,
  normalizeAdminSecurityFilters,
  rateLimitPosture,
  securityCoverage,
} from '../services/adminSecurityPostureService.ts';

test('security posture filters accept only supported actions and states', () => {
  assert.deepEqual(
    normalizeAdminSecurityFilters({
      action: 'password_reset_request',
      page: '3',
      state: 'active_block',
    }),
    { action: 'PASSWORD_RESET_REQUEST', page: 3, state: 'ACTIVE_BLOCK' },
  );
  assert.deepEqual(
    normalizeAdminSecurityFilters({ action: 'cashfree', page: '-2', state: 'unknown' }),
    { action: 'ALL', page: 1, state: 'ALL' },
  );
  assert.equal(normalizeAdminSecurityFilters({ action: 'ai_trip_plan' }).action, 'AI_TRIP_PLAN');
  assert.equal(normalizeAdminSecurityFilters({ action: 'mfa_mutation' }).action, 'MFA_MUTATION');
});

test('rate-limit posture distinguishes active and expired blocks without identifiers', () => {
  const now = new Date('2026-08-24T00:00:00.000Z');
  assert.equal(rateLimitPosture(null, now), 'OBSERVED');
  assert.equal(rateLimitPosture(new Date('2026-08-24T00:01:00.000Z'), now), 'ACTIVE_BLOCK');
  assert.equal(rateLimitPosture(new Date('2026-08-23T23:59:00.000Z'), now), 'EXPIRED_BLOCK');
});

test('security coverage is integer-safe and handles an empty population honestly', () => {
  assert.equal(securityCoverage(3, 4), 75);
  assert.equal(securityCoverage(5, 4), 100);
  assert.equal(securityCoverage(0, 0), 0);
  assert.equal(securityCoverage(-1, 4), 0);
});

test('security posture pagination preserves active filters', () => {
  const filters = normalizeAdminSecurityFilters({ action: 'login', state: 'expired_block' });
  assert.equal(
    adminSecurityPath(filters, 2),
    '/admin/security?page=2&action=LOGIN&state=EXPIRED_BLOCK',
  );
});
