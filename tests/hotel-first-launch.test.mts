import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the public booking widget launches hotels while transport stays coming soon', async () => {
  const widget = await source('components/home/HomeBookingWidget.tsx');

  assert.match(widget, /available: true, href: '\/hotels'/);
  for (const product of ['cars', 'flights', 'buses']) {
    assert.match(widget, new RegExp(`available: false, href: '\\/${product}'`));
  }
  assert.doesNotMatch(widget, /Search cars/);
});

test('car discovery is replaced by an honest coming-soon page', async () => {
  const [carsPage, comingSoon] = await Promise.all([
    source('app/cars/page.tsx'),
    source('components/common/MarketplaceComingSoon.tsx'),
  ]);

  assert.match(carsPage, /MarketplaceComingSoon product="Cars"/);
  assert.doesNotMatch(carsPage, /carService\.search|CarOfferCard|CarSearchForm/);
  assert.match(comingSoon, /verified hotel discovery, booking, and property/);
});

test('public hotel onboarding does not invite transport supplier applications', async () => {
  const applicationForm = await source('components/partner/PartnerApplicationForm.tsx');

  assert.match(applicationForm, /name="partnerType" type="hidden" value="HOTEL"/);
  assert.doesNotMatch(applicationForm, /option value="CAR"|option value="BUS"/);
  assert.match(applicationForm, /Hotel owner or property manager/);
});

test('the decorative dashed hero route is removed', async () => {
  const visualSystem = await source('styles/mandyal-visual-system.css');

  assert.doesNotMatch(visualSystem, /\.home-search-hero::before/);
  assert.doesNotMatch(visualSystem, /border-top: 2px dashed rgb\(73 112 244/);
});
