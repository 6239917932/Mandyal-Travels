import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ADMIN_SEARCH_PROJECTION_CONFIRMATION,
  normalizeAdminSearchProjectionHealth,
  normalizeAdminSearchProjectionRebuild,
} from '../services/adminSearchProjectionRules.ts';

test('search projection rebuilds require an exact confirmation and bounded reason', () => {
  assert.deepEqual(
    normalizeAdminSearchProjectionRebuild({
      confirmation: ` ${ADMIN_SEARCH_PROJECTION_CONFIRMATION} `,
      reason: ' Rebuild after publishing the reviewed hotel catalogue. ',
    }),
    {
      confirmation: ADMIN_SEARCH_PROJECTION_CONFIRMATION,
      reason: 'Rebuild after publishing the reviewed hotel catalogue.',
    },
  );
  assert.equal(
    normalizeAdminSearchProjectionRebuild({
      confirmation: 'rebuild hotel search',
      reason: 'Rebuild after publishing the reviewed hotel catalogue.',
    }),
    null,
  );
  assert.equal(
    normalizeAdminSearchProjectionRebuild({
      confirmation: ADMIN_SEARCH_PROJECTION_CONFIRMATION,
      reason: 'too short',
    }),
    null,
  );
  assert.equal(
    normalizeAdminSearchProjectionRebuild({
      confirmation: ADMIN_SEARCH_PROJECTION_CONFIRMATION,
      reason: 'x'.repeat(501),
    }),
    null,
  );
});

test('search projection health reports complete, empty, and attention states', () => {
  const projectedAt = new Date('2026-08-24T08:00:00.000Z');
  assert.deepEqual(
    normalizeAdminSearchProjectionHealth({
      currentCount: 8,
      latestProjectedAt: projectedAt,
      outdatedCount: 0,
      projectedCount: 8,
      sourceCount: 8,
    }),
    {
      currentCount: 8,
      latestProjectedAt: projectedAt,
      missingCount: 0,
      outdatedCount: 0,
      projectedCount: 8,
      sourceCount: 8,
      staleCount: 0,
      status: 'HEALTHY',
    },
  );
  assert.deepEqual(
    normalizeAdminSearchProjectionHealth({
      currentCount: 0,
      outdatedCount: 0,
      projectedCount: 0,
      sourceCount: 0,
    }),
    {
      currentCount: 0,
      latestProjectedAt: null,
      missingCount: 0,
      outdatedCount: 0,
      projectedCount: 0,
      sourceCount: 0,
      staleCount: 0,
      status: 'EMPTY',
    },
  );
  assert.deepEqual(
    normalizeAdminSearchProjectionHealth({
      currentCount: 5,
      outdatedCount: 2,
      projectedCount: 8,
      sourceCount: 9,
    }),
    {
      currentCount: 5,
      latestProjectedAt: null,
      missingCount: 2,
      outdatedCount: 2,
      projectedCount: 8,
      sourceCount: 9,
      staleCount: 1,
      status: 'ATTENTION',
    },
  );
});

test('search projection health rejects contradictory or unsafe counts', () => {
  assert.equal(
    normalizeAdminSearchProjectionHealth({
      currentCount: 3,
      outdatedCount: 1,
      projectedCount: 3,
      sourceCount: 4,
    }),
    null,
  );
  assert.equal(
    normalizeAdminSearchProjectionHealth({
      currentCount: -1,
      outdatedCount: 0,
      projectedCount: 0,
      sourceCount: 0,
    }),
    null,
  );
  assert.equal(
    normalizeAdminSearchProjectionHealth({
      currentCount: Number.MAX_SAFE_INTEGER + 1,
      outdatedCount: 0,
      projectedCount: Number.MAX_SAFE_INTEGER + 1,
      sourceCount: Number.MAX_SAFE_INTEGER + 1,
    }),
    null,
  );
});

test('search projection workbench is protected, reasoned, audited, and inventory safe', async () => {
  const [page, manager, route] = await Promise.all([
    readFile(new URL('../app/admin/search/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../components/admin/AdminSearchProjectionManager.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../app/api/v1/admin/search-projections/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /getPlatformAdmin\(\)/);
  assert.match(page, /redirect\('\/login\?returnTo=\/admin\/search'\)/);
  assert.match(route, /normalizeAdminSearchProjectionRebuild/);
  assert.match(route, /prisma\.\$transaction/);
  assert.match(route, /searchProjectionRebuildEvent\.create/);
  assert.match(manager, /never changes rates, availability,/);
  assert.match(manager, /inventory, bookings, supplier records, or payment data/);
  assert.doesNotMatch(page, /payloadJson|searchTerms|entityId/);
});
