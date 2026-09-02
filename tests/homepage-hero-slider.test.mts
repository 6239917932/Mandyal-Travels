import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const galleryImages = Array.from(
  { length: 16 },
  (_, index) => `bir-billing-${String(index + 1).padStart(2, '0')}.jpg`,
);

test('homepage moves every supplied Bir Billing photograph into the travel gallery', async () => {
  const gallery = await readFile(
    new URL('../components/home/HomeTravelGallery.tsx', import.meta.url),
    'utf8',
  );

  for (const image of galleryImages) {
    assert.match(gallery, new RegExp(image));
    assert.ok(
      (await stat(new URL(`../public/home/hero/${image}`, import.meta.url))).size > 0,
      `${image} must be a non-empty image asset`,
    );
  }

  assert.equal(gallery.match(/\['bir-billing-/g)?.length, galleryImages.length);
  assert.match(gallery, /Bir Billing paragliding/);
  assert.match(gallery, /From Billing&apos;s mountain launch site to Bir&apos;s landing fields/);
  assert.match(gallery, /window\.setInterval/);
  assert.match(gallery, /prefers-reduced-motion: reduce/);
  assert.match(gallery, /Pause automatic gallery/);
  assert.match(gallery, /Show next Bir Billing photograph/);
});

test('homepage hero provides a focused hotel-and-car-first booking widget', async () => {
  const [page, widget, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/home/HomeBookingWidget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../styles/home.css', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /mandyal-travel-hero-v2\.png/);
  assert.match(page, /<HomeBookingWidget \/>/);
  assert.match(page, /<HomeTravelGallery \/>/);
  assert.match(page, /Stay, drive, and grow with us\./);
  assert.match(
    page,
    /Flights and buses will follow after live\s+supplier integrations are verified/,
  );
  assert.doesNotMatch(page, /<HomeHeroSlider \/>/);
  assert.match(page, /<h2 className="home-intro__title" id="home-intro-title">/);

  assert.match(widget, /useState<BookingProduct>\('hotels'\)/);
  assert.match(widget, /role="tablist"/);
  assert.match(widget, /role="tabpanel"/);
  for (const route of ['/hotels', '/flights', '/buses', '/cars']) {
    assert.match(widget, new RegExp(`href: '${route}'`));
  }
  assert.match(widget, /Coming soon/);

  assert.match(styles, /\.home-search-hero\s*\{/);
  assert.match(styles, /\.home-booking-widget\s*\{/);
  assert.match(styles, /\.home-gallery__rail\s*\{[\s\S]*?overflow-x:\s*auto;/);
  assert.ok(
    (await stat(new URL('../public/home/mandyal-travel-hero-v2.png', import.meta.url))).size > 0,
    'the new professional hero artwork must be a non-empty image asset',
  );
});
