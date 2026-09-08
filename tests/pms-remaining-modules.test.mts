import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('remaining PMS modules use dedicated governed routes without duplicate operational stores', async () => {
  const [registry, procurement, fixedAssets, guestPortal, telephone, hr] = await Promise.all([
    read('lib/pms/moduleRegistry.ts'),
    read('app/partner/pms/procurement/page.tsx'),
    read('app/partner/pms/fixed-assets/page.tsx'),
    read('app/partner/pms/guest-portal/page.tsx'),
    read('app/partner/pms/telephone/page.tsx'),
    read('app/partner/pms/hr/page.tsx'),
  ]);
  for (const route of [
    '/partner/pms/procurement',
    '/partner/pms/fixed-assets',
    '/partner/pms/guest-portal',
    '/partner/pms/telephone',
    '/partner/pms/hr',
  ]) {
    assert.match(registry, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(procurement, /getPartnerStockInventory/);
  assert.match(procurement, /No duplicate inventory balance/);
  assert.doesNotMatch(procurement, /prisma\./);
  assert.match(
    fixedAssets,
    /does not treat[\s\S]*room repairs or consumable stock as fixed[\s\S]*assets/,
  );
  assert.match(
    guestPortal,
    /does not[\s\S]*create a second password, identity, or consent database/,
  );
  assert.match(
    telephone,
    /No call content, destination, wake-up request, or folio charge is[\s\S]*fabricated/,
  );
  assert.match(hr, /take: 501/);
  assert.match(hr, /statutory payroll/);
});

test('every new PMS workspace enforces authenticated hotel-partner scope', async () => {
  for (const page of ['procurement', 'fixed-assets', 'guest-portal', 'telephone', 'hr']) {
    const source = await read(`app/partner/pms/${page}/page.tsx`);
    assert.match(source, /getPartnerAccess\(\)/);
    assert.match(source, /access\.partnerType !== 'HOTEL'/);
    assert.match(source, /redirect\('\/partner'\)/);
  }
});
