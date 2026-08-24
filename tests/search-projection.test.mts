import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedCacheKey,
  hotelProjectionSearchTerms,
  normalizeSearchTerms,
  parseProjectionStringList,
  projectionVersion,
  staleHotelProjectionWhere,
} from '../lib/search/projection.ts';

test('search terms normalize, deduplicate, and sort', () => {
  assert.equal(normalizeSearchTerms(['Bir Billing', 'BIR, Kangra']), 'billing bir kangra');
});

test('projection versions and cache keys are stable without exposing inputs', () => {
  assert.equal(projectionVersion({ a: 1 }), projectionVersion({ a: 1 }));
  const key = boundedCacheKey('hotels', { destination: 'Bir' });
  assert.match(key, /^mandyal:v1:hotels:[0-9a-f]{32}$/);
  assert.equal(key.includes('Bir'), false);
});

test('hotel projections retain the complete governed destination vocabulary on every rebuild', () => {
  const terms = hotelProjectionSearchTerms({
    aliases: ['Hill station', 'Kullu valley'],
    city: 'Manali',
    displayName: 'Snow View Lodge',
    district: 'Kullu',
    locality: 'Old Manali',
    state: 'Himachal Pradesh',
    tehsil: 'Manali Tehsil',
  });

  const tokens = new Set(terms.split(' '));
  assert.ok(tokens.has('tehsil'));
  assert.ok(tokens.has('hill'));
  assert.ok(tokens.has('station'));
});

test('projection metadata parsing isolates malformed fields and rejects non-string facets', () => {
  assert.deepEqual(parseProjectionStringList('["Wi-Fi", 42, " Restaurant ", null]'), [
    'Wi-Fi',
    'Restaurant',
  ]);
  assert.deepEqual(parseProjectionStringList('{broken'), []);
});

test('hotel rebuilds remove stale rows without touching another projection type', () => {
  assert.deepEqual(staleHotelProjectionWhere(['hotel-1', 'hotel-2']), {
    entityType: 'HOTEL',
    entityId: { notIn: ['hotel-1', 'hotel-2'] },
  });
  assert.deepEqual(staleHotelProjectionWhere([]), { entityType: 'HOTEL' });
});
