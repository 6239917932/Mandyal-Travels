import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminAutomationPath,
  automationLeasePosture,
  automationWindowStart,
  normalizeAdminAutomationFilters,
  privateAutomationReference,
  safeAutomationSummary,
} from '../services/adminAutomationWorkbenchService.ts';

test('autopilot filters are closed, bounded, and preserve pagination', () => {
  assert.deepEqual(normalizeAdminAutomationFilters({ page: '3', status: 'failed', window: '30' }), {
    page: 3,
    status: 'FAILED',
    window: '30',
  });
  assert.deepEqual(
    normalizeAdminAutomationFilters({ page: '-2', status: 'DELETE', window: '365' }),
    {
      page: 1,
      status: 'ALL',
      window: '7',
    },
  );
  assert.equal(
    adminAutomationPath({ page: 3, status: 'FAILED', window: '30' }, 2),
    '/admin/automation?page=2&status=FAILED&window=30',
  );
});

test('autopilot windows and lease posture are deterministic', () => {
  const now = new Date('2026-08-26T12:00:00.000Z');
  assert.equal(automationWindowStart('7', now)?.toISOString(), '2026-08-19T12:00:00.000Z');
  assert.equal(automationWindowStart('ALL', now), null);
  assert.equal(
    automationLeasePosture({
      lastStatus: 'RUNNING',
      leaseExpiresAt: new Date('2026-08-26T12:01:00.000Z'),
      now,
    }),
    'ACTIVE',
  );
  assert.equal(
    automationLeasePosture({
      lastStatus: 'RUNNING',
      leaseExpiresAt: new Date('2026-08-26T11:59:00.000Z'),
      now,
    }),
    'ATTENTION',
  );
});

test('autopilot presentation accepts only safe numeric summary fields', () => {
  assert.deepEqual(
    safeAutomationSummary(
      JSON.stringify({
        correlationId: 'private',
        expiredAvailabilityLocks: 2,
        expiredBusSeatHolds: 3,
        releasedPromotionClaims: 4,
        secret: 'never render this',
      }),
    ),
    {
      deadLettered: 0,
      delivered: 0,
      expiredAvailabilityLocks: 2,
      expiredBusSeatHolds: 3,
      failed: 0,
      releasedPromotionClaims: 4,
    },
  );
  assert.deepEqual(safeAutomationSummary('{invalid'), {
    deadLettered: 0,
    delivered: 0,
    expiredAvailabilityLocks: 0,
    expiredBusSeatHolds: 0,
    failed: 0,
    releasedPromotionClaims: 0,
  });
  const reference = privateAutomationReference('private-correlation');
  assert.equal(reference.length, 12);
  assert.ok(!reference.includes('PRIVATE'));
});

test('autopilot workbench is administrator-only and read only', () => {
  const page = readFileSync(new URL('../app/admin/automation/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /getPlatformAdmin/);
  assert.match(page, /redirect\('\/login\?returnTo=\/admin\/automation'\)/);
  assert.match(page, /cannot capture payments/);
  assert.doesNotMatch(page, /<form[^>]+method="post"/i);
  assert.doesNotMatch(page, /AUTOPILOT_WORKER_SECRET/);
  assert.doesNotMatch(page, /leaseTokenHash/);
  assert.doesNotMatch(page, /errorCode/);
});
