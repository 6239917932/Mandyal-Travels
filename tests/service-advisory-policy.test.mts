import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  canTransitionServiceAdvisory,
  doesServiceAdvisoryMatchPath,
  isServiceAdvisoryVisible,
  normalizeServiceAdvisoryCreate,
  normalizeServiceAdvisoryTransition,
} from '../services/serviceAdvisoryPolicy.ts';

test('publishes only active or started scheduled advisories inside their window', () => {
  const now = new Date('2026-08-30T10:00:00.000Z');

  assert.equal(
    isServiceAdvisoryVisible(
      { status: 'SCHEDULED', startsAt: new Date('2026-08-30T09:00:00.000Z'), endsAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isServiceAdvisoryVisible(
      { status: 'ACTIVE', startsAt: null, endsAt: new Date('2026-08-30T09:59:59.000Z') },
      now,
    ),
    false,
  );
  assert.equal(
    isServiceAdvisoryVisible({ status: 'DRAFT', startsAt: null, endsAt: null }, now),
    false,
  );
});

test('matches service advisories to the correct customer surface', () => {
  assert.equal(doesServiceAdvisoryMatchPath('ALL', '/hotels'), true);
  assert.equal(doesServiceAdvisoryMatchPath('HOTELS', '/hotels/himalayan-retreat'), true);
  assert.equal(doesServiceAdvisoryMatchPath('HOTELS', '/flights'), false);
  assert.equal(doesServiceAdvisoryMatchPath('ACCOUNT', '/profile/security'), true);
  assert.equal(doesServiceAdvisoryMatchPath('PAYMENTS', '/checkout/payment'), true);
});

test('permits only governed lifecycle transitions', () => {
  assert.equal(canTransitionServiceAdvisory('DRAFT', 'ACTIVE'), true);
  assert.equal(canTransitionServiceAdvisory('ACTIVE', 'RESOLVED'), true);
  assert.equal(canTransitionServiceAdvisory('RESOLVED', 'ACTIVE'), false);
  assert.equal(canTransitionServiceAdvisory('CANCELLED', 'DRAFT'), false);
});

test('normalizes bounded advisory creation and timing', () => {
  const now = new Date('2026-08-30T10:00:00.000Z');
  const scheduled = normalizeServiceAdvisoryCreate(
    {
      endsAt: '2026-08-30T13:00:00.000Z',
      message: 'Flight search is undergoing scheduled supplier maintenance.',
      severity: 'WARNING',
      startsAt: '2026-08-30T11:00:00.000Z',
      status: 'SCHEDULED',
      surface: 'FLIGHTS',
      title: 'Scheduled flight maintenance',
    },
    now,
  );
  assert.equal(scheduled?.surface, 'FLIGHTS');
  assert.equal(scheduled?.startsAt?.toISOString(), '2026-08-30T11:00:00.000Z');
  assert.equal(
    normalizeServiceAdvisoryCreate(
      {
        endsAt: null,
        message: 'This scheduled notice starts in the past and must fail.',
        severity: 'INFO',
        startsAt: '2026-08-30T09:00:00.000Z',
        status: 'SCHEDULED',
        surface: 'ALL',
        title: 'Invalid schedule',
      },
      now,
    ),
    null,
  );
});

test('requires optimistic versioning and an audit reason for transitions', () => {
  assert.deepEqual(
    normalizeServiceAdvisoryTransition({
      expectedVersion: 2,
      reason: 'Supplier maintenance has completed successfully.',
      targetStatus: 'RESOLVED',
    }),
    {
      expectedVersion: 2,
      reason: 'Supplier maintenance has completed successfully.',
      targetStatus: 'RESOLVED',
    },
  );
  assert.equal(
    normalizeServiceAdvisoryTransition({
      expectedVersion: 0,
      reason: 'too short',
      targetStatus: 'ACTIVE',
    }),
    null,
  );
});

test('administrator routes enforce platform access and append audit events', () => {
  const createRoute = fs.readFileSync('app/api/v1/admin/service-advisories/route.ts', 'utf8');
  const transitionRoute = fs.readFileSync(
    'app/api/v1/admin/service-advisories/[advisoryId]/route.ts',
    'utf8',
  );
  const service = fs.readFileSync('services/serviceAdvisoryService.ts', 'utf8');
  const page = fs.readFileSync('app/admin/service-advisories/page.tsx', 'utf8');

  assert.match(createRoute, /getPlatformAdmin/);
  assert.match(transitionRoute, /getPlatformAdmin/);
  assert.match(page, /getPlatformAdmin/);
  assert.match(service, /serviceAdvisoryEvent\.create/);
  assert.match(service, /updateMany/);
  assert.match(service, /VERSION_CONFLICT/);
});
