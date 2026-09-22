import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage discovery uses only governed hotel and destination sources', async () => {
  const home = await source('app/page.tsx');

  assert.match(home, /hotelService\.getHotels\(\)/);
  assert.match(home, /where: \{ status: 'PUBLISHED' \}/);
  assert.match(home, /featuredHotels\.length > 0/);
  assert.match(home, /const editorialJourneys/);
  assert.match(home, /featuredDestinations\.length > 0\s+\? featuredDestinations\.map/);
  assert.doesNotMatch(home, /guest rating|five-star reviews|best price guarantee/i);
});

test('homepage discovery links remain hotel-first and usable', async () => {
  const home = await source('app/page.tsx');

  assert.match(home, /href=\{`\/hotels\?destination=/);
  assert.match(home, /href: `\/destinations\/\$\{destination\.slug\}`/);
  assert.match(home, /View all available stays/);
  assert.match(home, /Browse every published guide/);
});
