import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPlatformFeatureKey,
  normalizePlatformFeatureFlagUpdate,
  resolvePlatformFeatureState,
} from '../services/platformFeatureFlagRules.ts';

test('platform feature catalogue is closed and rejects invented controls', () => {
  assert.equal(isPlatformFeatureKey('AI_TRIP_PLANNER'), true);
  assert.equal(isPlatformFeatureKey('PARTNER_APPLICATIONS'), true);
  assert.equal(isPlatformFeatureKey('TRIAL_PARTNER_WORKSPACES'), true);
  assert.equal(isPlatformFeatureKey('PUBLIC_PARTNER_LISTINGS'), true);
  assert.equal(isPlatformFeatureKey('LIVE_MARKETPLACE_PAYMENTS'), true);
  assert.equal(isPlatformFeatureKey('CAR_MARKETPLACE'), true);
  assert.equal(isPlatformFeatureKey('CASHFREE'), false);
  assert.equal(isPlatformFeatureKey('PLATFORM_ADMIN_REGISTRATION'), false);
});

test('platform feature updates require a bounded reason and optimistic version', () => {
  assert.deepEqual(
    normalizePlatformFeatureFlagUpdate({
      enabled: false,
      expectedVersion: 2,
      reason: 'Pause while the service is reviewed.',
    }),
    {
      enabled: false,
      expectedVersion: 2,
      reason: 'Pause while the service is reviewed.',
    },
  );
  assert.equal(
    normalizePlatformFeatureFlagUpdate({
      enabled: false,
      expectedVersion: -1,
      reason: 'too short',
    }),
    null,
  );
});

test('platform features use safe defaults until an audited override exists', () => {
  assert.equal(resolvePlatformFeatureState('AI_TRIP_PLANNER', undefined).enabled, true);
  assert.equal(resolvePlatformFeatureState('PARTNER_APPLICATIONS', undefined).enabled, true);
  assert.equal(resolvePlatformFeatureState('TRIAL_PARTNER_WORKSPACES', undefined).enabled, true);
  assert.equal(resolvePlatformFeatureState('PUBLIC_PARTNER_LISTINGS', undefined).enabled, false);
  assert.equal(resolvePlatformFeatureState('LIVE_MARKETPLACE_PAYMENTS', undefined).enabled, false);
  assert.equal(resolvePlatformFeatureState('CAR_MARKETPLACE', undefined).enabled, false);
  assert.deepEqual(
    resolvePlatformFeatureState('PARTNER_APPLICATIONS', { enabled: false, version: 3 }),
    {
      defaultEnabled: true,
      description:
        'Accepts supplier applications for administrator review while listings, payouts, and live payments remain separately gated.',
      enabled: false,
      key: 'PARTNER_APPLICATIONS',
      label: 'New partner applications',
      version: 3,
    },
  );
});
