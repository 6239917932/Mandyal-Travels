import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  hotelbedsContentReadiness,
  hotelbedsContentReadinessLabel,
  parseHotelbedsContentRunSummary,
} from '../lib/hotel/hotelbedsContentReadiness.ts';
import { hotelbedsContentDeploymentReadiness } from '../lib/hotel/hotelbedsDeploymentReadiness.ts';

const now = new Date('2026-08-29T12:00:00.000Z');

test('content run summaries accept bounded evidence and reject malformed values', () => {
  assert.deepEqual(
    parseHotelbedsContentRunSummary(
      JSON.stringify({
        fetched: 100,
        language: 'ENG',
        mode: 'INITIAL',
        nextFrom: 101,
        pages: 1,
        unchanged: 25,
        upserted: 75,
      }),
    ),
    {
      fetched: 100,
      language: 'ENG',
      mode: 'INITIAL',
      nextFrom: 101,
      pages: 1,
      unchanged: 25,
      upserted: 75,
    },
  );
  assert.equal(parseHotelbedsContentRunSummary('{'), undefined);
  assert.equal(
    parseHotelbedsContentRunSummary(
      JSON.stringify({
        fetched: 1,
        language: '../ENG',
        mode: 'INITIAL',
        pages: 1,
        unchanged: 0,
        upserted: 1,
      }),
    ),
    undefined,
  );
  assert.equal(
    parseHotelbedsContentRunSummary(
      JSON.stringify({
        fetched: 1,
        language: 'ENG',
        mode: 'DIFFERENTIAL',
        pages: 1,
        unchanged: 0,
        upserted: 1,
      }),
    ),
    undefined,
  );
});

test('content freshness reports lifecycle states deterministically', () => {
  assert.equal(hotelbedsContentReadiness({ activePropertyCount: 0, now }).state, 'NOT_STARTED');
  assert.equal(
    hotelbedsContentReadiness({
      activePropertyCount: 1,
      lastRun: {
        completedAt: null,
        errorCode: '',
        failureCount: 0,
        processedCount: 0,
        startedAt: now,
        status: 'RUNNING',
        summaryJson: '',
      },
      now,
    }).state,
    'RUNNING',
  );
  assert.equal(
    hotelbedsContentReadiness({
      activePropertyCount: 1,
      newestFetchedAt: new Date('2026-08-29T00:00:00.000Z'),
      now,
    }).state,
    'FRESH',
  );
  assert.equal(
    hotelbedsContentReadiness({
      activePropertyCount: 1,
      newestFetchedAt: new Date('2026-08-27T12:00:00.000Z'),
      now,
    }).state,
    'AGING',
  );
  assert.equal(
    hotelbedsContentReadiness({
      activePropertyCount: 1,
      newestFetchedAt: new Date('2026-08-25T12:00:00.000Z'),
      now,
    }).state,
    'STALE',
  );
  assert.equal(
    hotelbedsContentReadiness({
      activePropertyCount: 1,
      newestFetchedAt: new Date('2026-08-30T00:00:00.000Z'),
      now,
    }).ageHours,
    0,
  );
  assert.equal(hotelbedsContentReadinessLabel('MIGRATION_REQUIRED'), 'Migration required');
});

test('deployment readiness fails closed only when content sync is explicitly required', () => {
  const configuration = {
    configured: true,
    enabled: true,
    environment: 'production' as const,
    productionBlocked: false,
  };
  assert.deepEqual(hotelbedsContentDeploymentReadiness({ configuration, syncEnabled: false }), {
    reason: 'SYNC_DISABLED',
    required: false,
    status: 'disabled',
  });
  assert.equal(
    hotelbedsContentDeploymentReadiness({
      configuration: { ...configuration, configured: false },
      syncEnabled: true,
    }).reason,
    'CREDENTIALS_INCOMPLETE',
  );
  assert.equal(
    hotelbedsContentDeploymentReadiness({
      configuration,
      content: { available: false, state: 'MIGRATION_REQUIRED' },
      syncEnabled: true,
    }).status,
    'unavailable',
  );

  const content = (newestFetchedAt: Date, status?: string) => ({
    available: true as const,
    readiness: hotelbedsContentReadiness({
      activePropertyCount: 20,
      ...(status
        ? {
            lastRun: {
              completedAt: status === 'RUNNING' ? null : now,
              errorCode: status === 'FAILED' ? 'PROVIDER_ERROR' : '',
              failureCount: status === 'FAILED' ? 1 : 0,
              processedCount: 0,
              startedAt: now,
              status,
              summaryJson: '',
            },
          }
        : {}),
      newestFetchedAt,
      now,
    }),
  });
  assert.equal(
    hotelbedsContentDeploymentReadiness({
      configuration,
      content: content(new Date('2026-08-29T00:00:00.000Z')),
      syncEnabled: true,
    }).status,
    'ready',
  );
  assert.equal(
    hotelbedsContentDeploymentReadiness({
      configuration,
      content: content(new Date('2026-08-27T12:00:00.000Z'), 'FAILED'),
      syncEnabled: true,
    }).status,
    'attention',
  );
  assert.equal(
    hotelbedsContentDeploymentReadiness({
      configuration,
      content: content(new Date('2026-08-25T12:00:00.000Z'), 'RUNNING'),
      syncEnabled: true,
    }).reason,
    'CACHE_STALE',
  );
});

test('admin observability and runtime health are bounded and hide sensitive data', async () => {
  const [page, service, healthRoute] = await Promise.all([
    readFile('app/admin/integrations/hotelbeds/page.tsx', 'utf8'),
    readFile('services/hotelbedsContentReadinessService.ts', 'utf8'),
    readFile('app/api/v1/health/route.ts', 'utf8'),
  ]);
  assert.match(page, /getHotelbedsContentReadiness/);
  assert.match(page, /Apply the reviewed database migration/);
  assert.doesNotMatch(page, /correlationId|payloadJson|<td>\{run\.summaryJson\}|errorCode/);
  assert.doesNotMatch(page, /<form|action=/);
  assert.match(service, /take: RECENT_RUN_LIMIT/);
  assert.match(service, /MIGRATION_REQUIRED/);
  assert.doesNotMatch(service, /HotelbedsEvaluationAdapter|fetch\(/);
  assert.match(healthRoute, /hotelbedsContentDeploymentReadiness/);
  assert.match(healthRoute, /status: unavailable \? 503 : 200/);
  assert.doesNotMatch(healthRoute, /HOTELBEDS_API_KEY|HOTELBEDS_SECRET/);
});
