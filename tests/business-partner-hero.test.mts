import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('business and partner heroes reuse the optimized homepage mountain image', async () => {
  const pages = await Promise.all([
    readFile(new URL('../app/business/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partners/page.tsx', import.meta.url), 'utf8'),
  ]);

  for (const page of pages) {
    assert.match(page, /import Image from 'next\/image'/);
    assert.match(page, /home-hero--interior home-hero--photo/);
    assert.match(page, /src="\/home\/mandyal-travel-hero-v2\.png"/);
    assert.match(page, /className="home-hero--photo__shade"/);
    assert.match(page, /\bpriority\b/);
  }
});
