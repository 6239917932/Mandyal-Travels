import assert from 'node:assert/strict';
import test from 'node:test';
import { flightRequestHash, normalizeProviderCode } from '../lib/flight/supplierOperations.ts';

test('flight provider codes are normalized and bounded', () => {
  assert.equal(normalizeProviderCode(' amadeus_ndc '), 'AMADEUS_NDC');
  assert.throws(() => normalizeProviderCode('../secret'));
});

test('flight operation request hashes are deterministic', () => {
  assert.equal(flightRequestHash({ route: 'DEL-BOM' }), flightRequestHash({ route: 'DEL-BOM' }));
});
