import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  INTEGRATION_OUTBOX_BATCH_DEFAULT,
  INTEGRATION_OUTBOX_BATCH_MAXIMUM,
  INTEGRATION_OUTBOX_LEASE_SECONDS_MINIMUM,
  boundedIntegrationOutboxInteger,
  integrationOutboxSummaryProcessed,
} from '../lib/automation/integrationOutboxRules.ts';

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('integration delivery batches and leases remain safely bounded', () => {
  assert.equal(INTEGRATION_OUTBOX_BATCH_DEFAULT, 25);
  assert.equal(INTEGRATION_OUTBOX_BATCH_MAXIMUM, 25);
  assert.equal(INTEGRATION_OUTBOX_LEASE_SECONDS_MINIMUM, 300);
  assert.equal(boundedIntegrationOutboxInteger('12', 25, 1, 25), 12);
  assert.equal(boundedIntegrationOutboxInteger('100', 25, 1, 25), 25);
  assert.equal(integrationOutboxSummaryProcessed({ delivered: 7, failed: 2 }), 9);
});

test('integration delivery automation is leased, replay safe, and preflights its provider', () => {
  const automation = read('services/integrationOutboxAutomationService.ts');
  assert.match(automation, /INTEGRATION_OUTBOX_DELIVERY_V1/);
  assert.match(automation, /automationJobLease/);
  assert.match(automation, /automationJobRun/);
  assert.match(automation, /integrationOutboxProviderConfiguration\(\)/);
  assert.match(automation, /DUPLICATE_CORRELATION_ID/);
  assert.match(automation, /leaseTokenHash/);
  assert.doesNotMatch(automation, /paymentTransaction\.(create|update|delete)/);
  assert.doesNotMatch(automation, /partnerSettlement\.(create|update|delete)/);
  assert.doesNotMatch(automation, /hotelBooking\.(create|update|delete)/);
  assert.doesNotMatch(automation, /partnerInventoryDay\.(create|update|delete)/);
});

test('integration provider boundary requires an approved endpoint and exact acknowledgement', () => {
  const provider = read('services/integrationOutboxProviderService.ts');
  assert.match(provider, /isAllowedProviderEndpoint/);
  assert.match(provider, /parseAllowedProviderHosts/);
  assert.match(provider, /redirect: 'error'/);
  assert.match(provider, /AbortSignal\.timeout/);
  assert.match(provider, /MAXIMUM_PAYLOAD_BYTES/);
  assert.match(provider, /accepted !== true/);
  assert.match(provider, /eventId !== event\.eventId/);
  assert.match(provider, /'Idempotency-Key': event\.eventId/);
});

test('worker endpoint has an independent constant-time secret boundary', () => {
  const route = read('app/api/v1/internal/workers/integration-outbox/route.ts');
  assert.match(route, /INTEGRATION_OUTBOX_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /MINIMUM_SECRET_LENGTH = 32/);
  assert.match(route, /AUTOMATION_ALREADY_RUNNING/);
  assert.doesNotMatch(route, /NOTIFICATION_WORKER_SECRET|AUTOPILOT_WORKER_SECRET/);
});

test('one-shot worker requires a safe origin and emits only allow-listed counts', () => {
  const worker = read('scripts/run-integration-outbox-worker.mjs');
  assert.match(worker, /PUBLIC_APP_ORIGIN must use HTTPS outside local development/);
  assert.match(worker, /INTEGRATION_OUTBOX_WORKER_BATCH_SIZE/);
  assert.match(worker, /\['deadLettered', 'delivered', 'failed', 'processedCount', 'recovered'\]/);
  assert.doesNotMatch(worker, /payloadJson|apiKey|Authorization.*stdout/);
});
