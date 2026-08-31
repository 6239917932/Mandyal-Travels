import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLATFORM_ADMIN_SESSION_DURATION_MS,
  sessionAbsoluteExpiry,
  sessionDurationMsForRole,
  STANDARD_SESSION_DURATION_MS,
} from '../lib/auth/sessionPolicy.ts';

test('platform administrator sessions use a short absolute lifetime', () => {
  assert.equal(PLATFORM_ADMIN_SESSION_DURATION_MS, 12 * 60 * 60 * 1000);
  assert.equal(sessionDurationMsForRole('PLATFORM_ADMIN'), PLATFORM_ADMIN_SESSION_DURATION_MS);
});

test('non-platform accounts retain the standard session lifetime', () => {
  for (const role of ['CUSTOMER', 'BUSINESS_ADMIN', 'BUSINESS_TRAVELLER', 'HOTEL_PARTNER']) {
    assert.equal(sessionDurationMsForRole(role), STANDARD_SESSION_DURATION_MS);
  }
});

test('absolute expiry is derived from creation time and role', () => {
  const createdAt = new Date('2026-08-31T00:00:00.000Z');

  assert.equal(
    sessionAbsoluteExpiry('PLATFORM_ADMIN', createdAt).toISOString(),
    '2026-08-31T12:00:00.000Z',
  );
  assert.equal(
    sessionAbsoluteExpiry('CUSTOMER', createdAt).toISOString(),
    '2026-09-30T00:00:00.000Z',
  );
});
