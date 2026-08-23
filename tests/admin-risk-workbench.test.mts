import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminRiskPath,
  normalizeAdminRiskFilters,
  privateSubjectReference,
  redactRiskNarrative,
  riskReviewPosture,
  riskWindowStart,
} from '../services/adminRiskWorkbenchService.ts';

test('risk workbench filters accept only bounded closed-catalogue values', () => {
  assert.deepEqual(
    normalizeAdminRiskFilters({
      page: '2',
      q: '  booking   review  ',
      severity: 'high',
      status: 'resolved',
      window: '90',
    }),
    { page: 2, query: 'booking review', severity: 'HIGH', status: 'RESOLVED', window: '90' },
  );
  assert.deepEqual(
    normalizeAdminRiskFilters({ severity: 'URGENT', status: 'BLOCK', window: '365' }),
    {
      page: 1,
      query: '',
      severity: 'ALL',
      status: 'OPEN',
      window: '30',
    },
  );
});

test('risk review posture distinguishes new, pending, aging, and reviewed signals', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  assert.equal(riskReviewPosture('OPEN', new Date('2026-08-24T11:00:00.000Z'), now), 'NEW');
  assert.equal(riskReviewPosture('OPEN', new Date('2026-08-23T00:00:00.000Z'), now), 'PENDING');
  assert.equal(riskReviewPosture('OPEN', new Date('2026-08-20T00:00:00.000Z'), now), 'AGING');
  assert.equal(
    riskReviewPosture('RESOLVED', new Date('2026-08-20T00:00:00.000Z'), now),
    'REVIEWED',
  );
});

test('risk presentation removes direct identifiers and keeps stable private correlation', () => {
  const reference = privateSubjectReference('USER', 'jasveer_singh@mandyaltravels.com');
  assert.equal(reference.length, 12);
  assert.equal(reference, privateSubjectReference('USER', 'jasveer_singh@mandyaltravels.com'));
  assert.ok(!reference.includes('JASVEER'));
  assert.equal(
    redactRiskNarrative('Login from 192.168.1.7 for jasveer@example.com and 9876543210'),
    'Login from [network address redacted] for [email redacted] and [identifier redacted]',
  );
});

test('risk workbench windows and pagination remain deterministic', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  assert.equal(riskWindowStart('30', now)?.toISOString(), '2026-07-25T12:00:00.000Z');
  assert.equal(riskWindowStart('ALL', now), null);
  assert.equal(
    adminRiskPath({ page: 4, query: 'booking', severity: 'HIGH', status: 'ALL', window: '90' }, 3),
    '/admin/risk?page=3&q=booking&severity=HIGH&status=ALL&window=90',
  );
});
