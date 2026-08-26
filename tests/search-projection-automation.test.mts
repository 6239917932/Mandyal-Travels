import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  SEARCH_PROJECTION_SOURCE_LIMIT_DEFAULT,
  SEARCH_PROJECTION_SOURCE_LIMIT_MAXIMUM,
  boundedSearchProjectionInteger,
  shouldRebuildSearchProjections,
} from '../lib/automation/searchProjectionRules.ts';

test('search projection automation rejects unbounded source sets', () => {
  assert.equal(
    boundedSearchProjectionInteger(undefined, SEARCH_PROJECTION_SOURCE_LIMIT_DEFAULT, 1, 100_000),
    5_000,
  );
  assert.equal(
    boundedSearchProjectionInteger('100000', 5_000, 1, SEARCH_PROJECTION_SOURCE_LIMIT_MAXIMUM),
    100_000,
  );
  assert.throws(() => boundedSearchProjectionInteger(0, 5_000, 1, 100_000));
  assert.throws(() => boundedSearchProjectionInteger(100_001, 5_000, 1, 100_000));
  assert.throws(() => boundedSearchProjectionInteger('invalid', 5_000, 1, 100_000));
});

test('search projection automation rebuilds only attention states', () => {
  assert.equal(shouldRebuildSearchProjections('ATTENTION'), true);
  assert.equal(shouldRebuildSearchProjections('HEALTHY'), false);
  assert.equal(shouldRebuildSearchProjections('EMPTY'), false);
  assert.equal(shouldRebuildSearchProjections('UNKNOWN'), false);
});

test('search projection worker is authenticated, leased, replay-safe, and non-financial', () => {
  const route = fs.readFileSync('app/api/v1/internal/workers/search-projections/route.ts', 'utf8');
  const service = fs.readFileSync('services/searchProjectionAutomationService.ts', 'utf8');
  assert.match(route, /AUTOPILOT_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(service, /automationJobLease/);
  assert.match(service, /existingRun\?\.status === 'SUCCEEDED'/);
  assert.match(service, /maximumSourceCount/);
  assert.match(service, /health\.status/);
  assert.doesNotMatch(service, /paymentTransaction\.(create|update|delete)/);
  assert.doesNotMatch(service, /refundRequest\.(create|update|delete)/);
  assert.doesNotMatch(service, /partnerPayout(?:Batch|Instruction)\.(create|update|delete)/);
  assert.doesNotMatch(service, /booking\.(create|update|delete)/);
});
