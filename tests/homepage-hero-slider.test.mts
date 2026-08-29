import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const expectedSlides = Array.from(
  { length: 16 },
  (_, index) => `/home/hero/bir-billing-${String(index + 1).padStart(2, '0')}.jpg`,
);

test('homepage hero includes every supplied Bir Billing photograph', async () => {
  const slider = await readFile(
    new URL('../components/home/HomeHeroSlider.tsx', import.meta.url),
    'utf8',
  );

  for (const slide of expectedSlides) {
    assert.match(slider, new RegExp(slide.replaceAll('/', '\\/')));

    const asset = new URL(`../public${slide}`, import.meta.url);
    assert.ok((await stat(asset)).size > 0, `${slide} must be a non-empty image asset`);
  }

  assert.equal(slider.match(/src: '\/home\/hero\/bir-billing-/g)?.length, expectedSlides.length);
});

test('homepage hero slider is controllable, motion-aware, and page-integrated', async () => {
  const [page, slider, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/home/HomeHeroSlider.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../styles/home.css', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<HomeHeroSlider \/>/);
  assert.doesNotMatch(page, /mandi-himalayan-hero-v1\.png/);
  assert.match(slider, /prefers-reduced-motion: reduce/);
  assert.match(slider, /document\.hidden/);
  assert.match(slider, /event\.key === 'ArrowLeft'/);
  assert.match(slider, /event\.key === 'ArrowRight'/);
  assert.match(slider, /aria-label="Show previous hero photograph"/);
  assert.match(slider, /aria-label="Show next hero photograph"/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.home-hero-slider__dots button\.is-active/);
});
