import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedCacheKey,
  normalizeSearchTerms,
  projectionVersion,
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
