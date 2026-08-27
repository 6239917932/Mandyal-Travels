import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminPromotionPath,
  normalizeAdminPromotionFilters,
  normalizePromotionStatusUpdate,
  promotionActivationBlockReason,
  promotionOperationalState,
  readPromotionProducts,
  resolveStoredPromotionRule,
} from '../services/adminPromotionWorkbenchService.ts';

const promotionManagerSource = readFileSync('components/admin/AdminPromotionManager.tsx', 'utf8');

const now = new Date('2026-08-24T12:00:00.000Z');
const campaign = {
  active: true,
  code: 'STAYMORE',
  endsAt: new Date('2026-08-30T00:00:00.000Z'),
  maximumDiscount: 1500,
  minimumSubtotal: 8000,
  percentOff: 12,
  productsJson: '["HOTEL"]',
  startsAt: new Date('2026-08-20T00:00:00.000Z'),
  usageLimit: null,
  usageCount: 0,
  version: 3,
};

test('promotion workbench filters and paths stay bounded and deterministic', () => {
  const filters = normalizeAdminPromotionFilters({
    page: '3',
    product: 'hotel',
    q: '  summer   sale ',
    status: 'active',
  });
  assert.deepEqual(filters, {
    page: 3,
    product: 'HOTEL',
    query: 'summer sale',
    status: 'ACTIVE',
  });
  assert.equal(
    adminPromotionPath(filters, 2),
    '/admin/promotions?page=2&q=summer+sale&product=HOTEL&status=ACTIVE',
  );
  assert.deepEqual(normalizeAdminPromotionFilters({ page: '-2', status: 'LIVE' }), {
    page: 1,
    product: 'ALL',
    query: '',
    status: 'ALL',
  });
});

test('promotion state exposes active and exhausted capped campaigns', () => {
  assert.equal(promotionOperationalState(campaign, now), 'ACTIVE');
  assert.equal(
    promotionOperationalState({ ...campaign, usageCount: 99, usageLimit: 100 }, now),
    'ACTIVE',
  );
  assert.equal(
    promotionOperationalState({ ...campaign, usageCount: 100, usageLimit: 100 }, now),
    'EXHAUSTED',
  );
  assert.equal(
    promotionOperationalState({ ...campaign, endsAt: new Date('2026-08-23T00:00:00.000Z') }, now),
    'EXPIRED',
  );
  assert.equal(
    promotionOperationalState({ ...campaign, startsAt: new Date('2026-08-25T00:00:00.000Z') }, now),
    'SCHEDULED',
  );
});

test('promotion activation requires valid products and an open window', () => {
  assert.equal(promotionActivationBlockReason(campaign, now), null);
  assert.equal(promotionActivationBlockReason({ ...campaign, usageLimit: 20 }, now), null);
  assert.match(
    promotionActivationBlockReason({ ...campaign, productsJson: 'invalid' }, now) ?? '',
    /product eligibility/,
  );
  assert.match(
    promotionActivationBlockReason(
      { ...campaign, endsAt: new Date('2026-08-23T00:00:00.000Z') },
      now,
    ) ?? '',
    /Expired/,
  );
});

test('campaign state changes require optimistic version and a bounded reason', () => {
  assert.deepEqual(
    normalizePromotionStatusUpdate({
      active: false,
      expectedVersion: 3,
      reason: 'Pause while the campaign terms are reviewed.',
    }),
    {
      active: false,
      expectedVersion: 3,
      reason: 'Pause while the campaign terms are reviewed.',
    },
  );
  assert.equal(
    normalizePromotionStatusUpdate({ active: true, expectedVersion: 0, reason: 'too short' }),
    null,
  );
});

test('stored campaigns override baseline codes and never bypass a paused state', () => {
  assert.equal(resolveStoredPromotionRule(campaign, 'HOTEL', now)?.version, 3);
  assert.equal(resolveStoredPromotionRule({ ...campaign, active: false }, 'HOTEL', now), undefined);
  assert.equal(
    resolveStoredPromotionRule({ ...campaign, usageLimit: 5 }, 'HOTEL', now)?.version,
    3,
  );
  assert.equal(
    resolveStoredPromotionRule({ ...campaign, usageCount: 5, usageLimit: 5 }, 'HOTEL', now),
    undefined,
  );
  assert.deepEqual(readPromotionProducts('["HOTEL","HOTEL","BUS","UNKNOWN"]'), ['HOTEL', 'BUS']);
  const source = readFileSync('services/promotionService.ts', 'utf8');
  assert.match(source, /findUnique\(\{[\s\S]*where:\s*\{\s*code:\s*normalizedCode\s*\}/);
  assert.match(source, /releaseExpiredPromotionClaims/);
  assert.match(source, /if \(!campaign\) return findPromotionRule/);
});

test('promotion form describes persisted usage-cap enforcement', () => {
  assert.match(
    promotionManagerSource,
    /Usage cap \(optional; reserved and redeemed claims count toward the limit\)/,
  );
  assert.doesNotMatch(
    promotionManagerSource,
    /activation blocked until redemption tracking exists/i,
  );
});
