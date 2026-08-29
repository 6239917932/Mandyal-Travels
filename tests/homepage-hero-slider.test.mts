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
  assert.doesNotMatch(page, /<MandyalLogo/);
  assert.doesNotMatch(page, /home-hero__overlay/);
  assert.match(page, /className="home-hero home-hero--gallery"/);
  assert.match(page, /aria-labelledby="home-intro-title" className="home-intro"/);
  assert.ok(
    page.indexOf('className="home-intro"') > page.indexOf('<HomeHeroSlider />'),
    'the introductory copy must follow the unobstructed photography',
  );
  assert.match(slider, /prefers-reduced-motion: reduce/);
  assert.match(slider, /document\.hidden/);
  assert.match(slider, /event\.key === 'ArrowLeft'/);
  assert.match(slider, /event\.key === 'ArrowRight'/);
  assert.match(slider, /aria-label="Show previous hero photograph"/);
  assert.match(slider, /aria-label="Show next hero photograph"/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.home-hero-slider__dots button\.is-active/);
  assert.match(slider, /className="home-hero-slider__backdrop"/);
  assert.match(
    styles,
    /\.home-hero-slider__media\s*\{[\s\S]*?overflow:\s*hidden;/,
    'the hero media frame must contain the softened backdrop',
  );
  assert.match(
    styles,
    /\.home-hero-slider__backdrop\s*\{[\s\S]*?object-fit:\s*cover;[\s\S]*?filter:\s*blur\(24px\) brightness\(0\.48\)/,
    'the unused hero margins should be filled by a softened image extension',
  );
  assert.match(
    styles,
    /\.home-hero-slider__image\s*\{[\s\S]*?object-fit:\s*contain;/,
    'the complete hero photograph must remain visible without cover cropping',
  );
  assert.match(
    styles,
    /\.home-hero-slider__controls\s*\{[\s\S]*?left:\s*50%;[\s\S]*?width:\s*min\(23rem,[\s\S]*?transform:\s*translateX\(-50%\);/,
    'the compact gallery control must remain centered over the photograph',
  );
  assert.match(styles, /\.home-intro__grid/);
  assert.match(styles, /\.home-intro__title/);
});
