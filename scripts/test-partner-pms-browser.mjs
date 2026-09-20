// Run against the isolated database produced by seed-admin-audit.mts only.
// Requires PLAYWRIGHT_MODULE pointing to an installed Playwright index.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const origin = 'http://localhost:3019';
const fixture = JSON.parse(fs.readFileSync('.gh-task-cache/admin-audit-fixture.json', 'utf8'));
assert.equal(path.resolve(fixture.databasePath), path.resolve('prisma/admin-audit-e2e.db'));
assert.ok(fixture.partnerToken, 'Partner browser token is missing from the isolated fixture.');

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { height: 1000, width: 1440 } });
await context.addCookies([{ name: 'mandyal_session', value: fixture.partnerToken, url: origin }]);
const results = { origin, startedAt: new Date().toISOString(), pages: [], errors: [] };
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  return url.origin === origin || ['data:', 'blob:'].includes(url.protocol)
    ? route.continue()
    : route.abort();
});

const page = await context.newPage();
page.on('pageerror', (error) => results.errors.push({ message: error.message, url: page.url() }));
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
const pmsRoutes = walk('app/partner/pms')
  .filter((file) => file.endsWith('page.tsx'))
  .map((file) =>
    `/${file
      .replaceAll('\\', '/')
      .replace(/^app\//, '')
      .replace(/\/page.tsx$/, '')}`.replace('/[code]', '/pg'),
  );
const routes = [
  '/partner',
  '/partner/bookings',
  '/partner/amendments',
  '/partner/properties',
  '/partner/inventory',
  '/partner/channels',
  '/partner/housekeeping',
  '/partner/reviews',
  '/partner/settlements',
  '/partner/compliance',
  '/partner/tax',
  '/partner/activity',
  '/partner/access',
  ...pmsRoutes,
].toSorted();

try {
  for (const route of routes) {
    const response = await page.goto(`${origin}${route}`, {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, `${route}: HTTP ${response.status()}`);
    assert.equal(new URL(page.url()).pathname, route, `${route}: unexpected redirect`);
    assert.ok(await page.locator('#workspace-main h1').count(), `${route}: missing main heading`);
    assert.doesNotMatch(
      await page.locator('body').innerText(),
      /Application error:|Internal Server Error|Something went wrong|This page could not be found/i,
      `${route}: rendered an application error`,
    );
    const record = await page.locator('#workspace-main').evaluate((main) => ({
      buttons: [...main.querySelectorAll('button')].map((node) => ({
        disabled: node.disabled,
        text: node.textContent?.trim() ?? '',
        type: node.type,
      })),
      forms: main.querySelectorAll('form').length,
      headings: [...main.querySelectorAll('h1,h2,h3')].map(
        (node) => node.textContent?.trim() ?? '',
      ),
      links: [...main.querySelectorAll('a[href]')].map((node) => ({
        href: node.getAttribute('href'),
        text: node.textContent?.trim() ?? '',
      })),
    }));
    assert.equal(
      record.links.some((link) => link.href === '#'),
      false,
      `${route}: placeholder link`,
    );
    results.pages.push({ pass: true, route, ...record });
    console.log(
      `PAGE ${route}: OK (${record.buttons.length} buttons, ${record.links.length} links, ${record.forms} forms)`,
    );
  }
  const sidebarLinks = await page
    .locator('#workspace-navigation a[href]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const duplicates = sidebarLinks.filter((href, index) => sidebarLinks.indexOf(href) !== index);
  assert.deepEqual(duplicates, [], `Duplicate PMS sidebar destinations: ${duplicates.join(', ')}`);
  assert.equal(results.errors.length, 0, JSON.stringify(results.errors));
  results.completedAt = new Date().toISOString();
  results.summary = { failed: 0, passed: results.pages.length, total: routes.length };
  fs.writeFileSync(
    '.gh-task-cache/partner-pms-browser-audit.json',
    JSON.stringify(results, null, 2),
  );
  console.log(`Partner PMS browser audit passed: ${routes.length}/${routes.length} pages.`);
} finally {
  await browser.close();
}
