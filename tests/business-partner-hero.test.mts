import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicNavigationPages = [
  'hotels',
  'cars',
  'trip-planner',
  'destinations',
  'offers',
  'business',
  'partners',
  'manage-booking',
] as const;

test('public navigation pages share one optimized mountain hero', async () => {
  const [hero, ...pages] = await Promise.all([
    readFile(new URL('../components/layout/PublicPageHero.tsx', import.meta.url), 'utf8'),
    ...publicNavigationPages.map((page) =>
      readFile(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8'),
    ),
  ]);

  assert.match(hero, /import Image from 'next\/image'/);
  assert.match(hero, /src="\/home\/mandyal-travel-hero-v2\.png"/);
  assert.match(hero, /className="public-page-hero__shade"/);
  assert.match(hero, /\.filter\(Boolean\)\s*\.join\(' '\)/);
  assert.match(hero, /\bpriority\b/);

  for (const page of pages) {
    assert.match(page, /import \{ PublicPageHero \}/);
    assert.match(page, /<PublicPageHero/);
  }
});

test('future flight and bus pages inherit the shared hero through the launch-status component', async () => {
  const [component, flights, buses] = await Promise.all([
    readFile(new URL('../components/common/MarketplaceComingSoon.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/flights/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/buses/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(component, /<PublicPageHero/);
  assert.match(flights, /MarketplaceComingSoon/);
  assert.match(buses, /MarketplaceComingSoon/);
});
