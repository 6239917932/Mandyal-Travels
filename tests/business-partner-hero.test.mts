import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicNavigationPages = [
  'hotels',
  'trip-planner',
  'destinations',
  'offers',
  'manage-booking',
] as const;

test('public navigation pages use the configurable optimized hero system', async () => {
  const [hero, ...pages] = await Promise.all([
    readFile(new URL('../components/layout/PublicPageHero.tsx', import.meta.url), 'utf8'),
    ...publicNavigationPages.map((page) =>
      readFile(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8'),
    ),
  ]);

  assert.match(hero, /import Image from 'next\/image'/);
  assert.match(hero, /imageSrc\?: string/);
  assert.match(hero, /imageSrc = '\/home\/mandyal-travel-hero-v2\.png'/);
  assert.match(hero, /src=\{imageSrc\}/);
  assert.match(hero, /className="public-page-hero__shade"/);
  assert.match(hero, /\.filter\(Boolean\)\s*\.join\(' '\)/);
  assert.match(hero, /\bpriority\b/);

  for (const page of pages) {
    assert.match(page, /import \{ PublicPageHero \}/);
    assert.match(page, /<PublicPageHero/);
  }
});

test('hotel-first public pages use distinct purpose-built hero images', async () => {
  const [tripPlanner, destinations, offers, manageBooking, contact] = await Promise.all([
    readFile(new URL('../app/trip-planner/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/destinations/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/offers/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/manage-booking/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/contact/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(tripPlanner, /trip-planner-hero-v1\.png/);
  assert.match(destinations, /destinations-hero-v1\.png/);
  assert.match(offers, /offers-hero-v1\.png/);
  assert.match(offers, /product\.product === 'HOTEL'/);
  assert.match(manageBooking, /manage-booking-hero-v1\.png/);
  assert.match(contact, /contact-hero-v1\.png/);
});

test('retired public business and partner pages preserve permanent workspace redirects', async () => {
  const [business, partners] = await Promise.all([
    readFile(new URL('../app/business/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partners/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(business, /permanentRedirect\('\/login#business'\)/);
  assert.match(partners, /permanentRedirect\('\/login#partner'\)/);
});

test('future car, flight, and bus pages inherit the shared hero through the launch-status component', async () => {
  const [component, cars, flights, buses] = await Promise.all([
    readFile(new URL('../components/common/MarketplaceComingSoon.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/cars/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/flights/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/buses/page.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(component, /<PublicPageHero/);
  assert.match(cars, /MarketplaceComingSoon/);
  assert.match(flights, /MarketplaceComingSoon/);
  assert.match(buses, /MarketplaceComingSoon/);
});
