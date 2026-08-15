import assert from 'node:assert/strict';
import test from 'node:test';

import { distanceInKilometres } from '../lib/hotel/geo.ts';

test('returns zero for identical hotel coordinates', () => {
  const coordinate = { latitude: 32.2396, longitude: 76.3234 };
  assert.equal(distanceInKilometres(coordinate, coordinate), 0);
});

test('calculates a stable radius distance between nearby destinations', () => {
  const bir = { latitude: 32.0456, longitude: 76.7236 };
  const palampur = { latitude: 32.1109, longitude: 76.5363 };
  const distance = distanceInKilometres(bir, palampur);

  assert.ok(distance > 18);
  assert.ok(distance < 20);
});
