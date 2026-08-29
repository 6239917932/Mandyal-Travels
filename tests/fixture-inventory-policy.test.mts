import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isFixtureInventoryEnabled } from '../lib/inventory/fixtureInventoryPolicy.ts';

test('fixture inventory remains available for local preview unless explicitly disabled', () => {
  assert.equal(isFixtureInventoryEnabled({ NODE_ENV: 'development' }), true);
  assert.equal(
    isFixtureInventoryEnabled({ FIXTURE_INVENTORY_ENABLED: 'false', NODE_ENV: 'development' }),
    false,
  );
  assert.equal(isFixtureInventoryEnabled({ NODE_ENV: 'test' }), true);
});

test('fixture inventory always fails closed in production', () => {
  assert.equal(isFixtureInventoryEnabled({ NODE_ENV: 'production' }), false);
  assert.equal(
    isFixtureInventoryEnabled({ FIXTURE_INVENTORY_ENABLED: 'true', NODE_ENV: 'production' }),
    false,
  );
});

test('every fixture-backed repository applies the production policy before returning fixtures', async () => {
  const sources = await Promise.all(
    [
      '../repositories/hotelRepository.ts',
      '../repositories/flightOfferRepository.ts',
      '../repositories/busOfferRepository.ts',
      '../repositories/carOfferRepository.ts',
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
  );

  for (const source of sources) {
    assert.match(source, /isFixtureInventoryEnabled/);
    assert.match(source, /fixtureInventoryEnabled/);
  }
  assert.match(sources[0]!, /this\.fixtureInventoryEnabled \? mockHotels : \[\]/);
  for (const source of sources.slice(1)) {
    assert.match(source, /if \(!this\.fixtureInventoryEnabled\) return \[\]/);
  }
});

test('release preflight explicitly rejects fixture inventory in production', async () => {
  const script = await readFile(
    new URL('../scripts/verify-release-env.mjs', import.meta.url),
    'utf8',
  );
  assert.match(script, /FIXTURE_INVENTORY_ENABLED must not be true in production/);
});
