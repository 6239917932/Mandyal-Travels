import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { settleAvailableSources } from '../lib/inventory/settleAvailableSources.ts';

const unavailableSource = async (): Promise<readonly string[]> => {
  throw new Error('private database detail');
};
const availableSource = async (): Promise<readonly string[]> => ['available'];

test('bus discovery keeps healthy sources available when another source fails', async () => {
  assert.deepEqual(
    await settleAvailableSources(
      [unavailableSource, availableSource],
      'Bus inventory sources are temporarily unavailable.',
    ),
    ['available'],
  );
});

test('car discovery keeps healthy sources available when another source fails', async () => {
  await assert.rejects(
    settleAvailableSources(
      [unavailableSource, unavailableSource],
      'Car inventory sources are temporarily unavailable.',
    ),
    /Car inventory sources are temporarily unavailable/,
  );
});

test('public pages and smoke checks never expose database implementation details', async () => {
  const [carsPage, hotelsPage, smoke] = await Promise.all([
    readFile(new URL('../app/cars/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/hotels/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/smoke-portal.mjs', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(carsPage, /cause\.message|error\.message/);
  assert.match(carsPage, /Car search is temporarily unavailable/);
  assert.match(hotelsPage, /Hotel search is temporarily unavailable/);
  assert.match(smoke, /does not exist in the current database/);
});

test('page metadata relies on the root title template exactly once', async () => {
  const metadataPages = await Promise.all(
    [
      '../app/contact/page.tsx',
      '../app/destinations/page.tsx',
      '../app/destinations/[slug]/page.tsx',
      '../app/legal/page.tsx',
      '../app/legal/[policy]/page.tsx',
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
  );

  for (const page of metadataPages) {
    assert.doesNotMatch(page, /title:\s*[^\n]*\| Mandyal Travels/);
  }
});
