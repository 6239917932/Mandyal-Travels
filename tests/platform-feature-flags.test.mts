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
  assert.deepEqual(
    resolvePlatformFeatureState('PARTNER_APPLICATIONS', { enabled: false, version: 3 }),
    {
      defaultEnabled: true,
      description:
        'Controls new supplier application entry and submission. Existing access remains.',
      enabled: false,
      key: 'PARTNER_APPLICATIONS',
      label: 'New partner applications',
      version: 3,
    },
  );
});
