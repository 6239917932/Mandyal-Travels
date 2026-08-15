import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeExternalReference,
  normalizeProviderName,
  normalizeSyncDirection,
} from '../lib/hotel/channelRules.ts';

test('channel provider and external references are normalized', () => {
  assert.equal(normalizeProviderName('  SiteMinder   Exchange '), 'SiteMinder Exchange');
  assert.equal(normalizeExternalReference('hotel_123-IN', 'Property'), 'hotel_123-IN');
});

test('unsafe provider references and sync directions are rejected', () => {
  assert.throws(() => normalizeExternalReference('../secret', 'Account'));
  assert.throws(() => normalizeSyncDirection('DELETE'));
});
