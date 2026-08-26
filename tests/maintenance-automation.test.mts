import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  MAINTENANCE_BATCH_DEFAULT,
  MAINTENANCE_BATCH_MAXIMUM,
  boundedMaintenanceInteger,
  maintenanceSummaryProcessed,
} from '../lib/automation/maintenanceRules.ts';

test('maintenance limits reject unbounded or malformed batches', () => {
  assert.equal(boundedMaintenanceInteger(undefined, MAINTENANCE_BATCH_DEFAULT, 1, 100), 25);
  assert.equal(boundedMaintenanceInteger('100', 25, 1, MAINTENANCE_BATCH_MAXIMUM), 100);
  assert.throws(() => boundedMaintenanceInteger(0, 25, 1, 100), /INVALID_AUTOMATION_LIMIT/);
  assert.throws(() => boundedMaintenanceInteger(101, 25, 1, 100), /INVALID_AUTOMATION_LIMIT/);
  assert.throws(() => boundedMaintenanceInteger('not-a-number', 25, 1, 100));
});

test('maintenance summaries count only safe expiry transitions', () => {
  assert.equal(
    maintenanceSummaryProcessed({
      expiredAvailabilityLocks: 2,
      expiredBusSeatHolds: 3,
      releasedPromotionClaims: 4,
    }),
    9,
  );
});

test('maintenance worker remains authenticated, leased, bounded, and non-financial', () => {
  const route = fs.readFileSync('app/api/v1/internal/workers/maintenance/route.ts', 'utf8');
  const service = fs.readFileSync('services/maintenanceAutomationService.ts', 'utf8');
  assert.match(route, /AUTOPILOT_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(service, /automationJobLease/);
  assert.match(service, /existingRun\?\.status === 'SUCCEEDED'/);
  assert.match(service, /take: batchSize/);
  assert.match(service, /status: 'expired'/);
  assert.doesNotMatch(service, /paymentTransaction\.(create|update|delete)/);
  assert.doesNotMatch(service, /refundRequest\.(create|update|delete)/);
  assert.doesNotMatch(service, /partnerSettlement\.(create|update|delete)/);
});
