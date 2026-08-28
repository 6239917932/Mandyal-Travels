import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { siteConfig } from '../config/site.ts';

test('public contact details are centralized and complete', () => {
  assert.equal(siteConfig.supportEmail, 'support@mandyaltravels.com');
  assert.match(siteConfig.supportPhone.href, /^\+\d{10,15}$/);
  assert.equal(siteConfig.officeLocations.length, 3);
  assert.deepEqual(
    siteConfig.officeLocations.map((office) => office.locality),
    ['Bir, District Kangra', 'Joginder Nagar, District Mandi', 'Chandigarh'],
  );
});

test('homepage and footer direct customers to the centralized contact experience', async () => {
  const [home, footer] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/layout/SiteFooter.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(home, /siteConfig\.officeLocations\.map/);
  assert.match(home, /href="\/contact"/);
  assert.match(home, /tel:\$\{siteConfig\.supportPhone\.href\}/);
  assert.match(footer, /Contact us and office locations/);
  assert.match(footer, /siteConfig\.supportPhone\.display/);
});

test('contact page is actionable without pretending to submit unsupported messages', async () => {
  const contact = await readFile(new URL('../app/contact/page.tsx', import.meta.url), 'utf8');

  assert.match(contact, /siteConfig\.officeLocations\.map/);
  assert.match(contact, /mailto:\$\{siteConfig\.supportEmail\}/);
  assert.match(contact, /Please call before planning an in-person visit/);
  assert.match(contact, /never send card details, passwords, or one-time/);
  assert.doesNotMatch(contact, /<main\b/i);
  assert.doesNotMatch(contact, /<form|method="post"|fetch\(/i);
});
