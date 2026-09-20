import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  countPmsModules,
  getPmsModule,
  getPmsModuleHref,
  pmsModuleGroups,
  pmsModules,
} from '../lib/pms/moduleRegistry.ts';

test('PMS module names are unique and every live module has a destination', () => {
  assert.equal(new Set(pmsModules.map((module) => module.code)).size, pmsModules.length);
  assert.equal(new Set(pmsModules.map((module) => module.name)).size, pmsModules.length);
  assert.ok(pmsModules.filter((module) => module.status === 'LIVE').every((module) => module.href));
  assert.ok(pmsModules.every((module) => getPmsModuleHref(module).startsWith('/partner/')));
  const liveDestinations = pmsModules
    .filter((module) => module.status === 'LIVE')
    .map((module) => module.href);
  assert.equal(new Set(liveDestinations).size, liveDestinations.length);
  assert.equal(getPmsModule('RS')?.href, '/partner/pms/reservations');
});

test('every configured PMS destination is backed by an application page', () => {
  for (const pmsModule of pmsModules) {
    const href = getPmsModuleHref(pmsModule);
    const directPage = `app${href}/page.tsx`;
    const controlledModulePage = 'app/partner/pms/modules/[code]/page.tsx';

    assert.ok(
      fs.existsSync(directPage) ||
        (href.startsWith('/partner/pms/modules/') && fs.existsSync(controlledModulePage)),
      `${pmsModule.code} (${pmsModule.name}) points to a missing page: ${href}`,
    );
  }
});

test('every non-live PMS module resolves to its controlled workspace', () => {
  for (const pmsModule of pmsModules.filter((entry) => !entry.href)) {
    assert.equal(
      getPmsModuleHref(pmsModule),
      `/partner/pms/modules/${pmsModule.code.toLowerCase()}`,
    );
    assert.equal(getPmsModule(pmsModule.code.toLowerCase()), pmsModule);
  }
  assert.equal(getPmsModule('unknown'), undefined);
});

test('PMS registry exposes a controlled multi-phase rollout', () => {
  assert.equal(pmsModules.length, 51);
  assert.equal(pmsModuleGroups.length, 7);
  assert.equal(countPmsModules('LIVE'), 47);
  assert.equal(countPmsModules('FOUNDATION'), 3);
  assert.equal(countPmsModules('PLANNED'), 1);
  assert.deepEqual([...new Set(pmsModules.map((module) => module.phase))], [1, 2, 3, 4]);
});

test('PMS registry contains every approved operational navigation area', () => {
  const names = new Set(pmsModules.map((module) => module.name));
  for (const required of [
    'Owner overview',
    'Revenue intelligence',
    'Booking packages and add-ons',
    'Room rack',
    'Walk-in booking',
    'Guest registration',
    'Night audit',
    'Point of sale',
    'Kitchen display',
    'Group bookings and banquets',
    'Attendant view',
    'Laundry',
    'Spa and wellness',
    'Housekeeping requests',
    'Maintenance',
    'Lost and found',
    'Central reservations',
    'Booking engine',
    'Billing and cashier',
    'GST billing',
    'Accounting and ledgers',
    'Stock and inventory',
    'Procurement',
    'Fixed assets',
    'Guest profiles and CRM',
    'Guest portal',
    'Telephone and EPABX',
    'HR and payroll',
    'Access control',
    'Restaurant menus and tables',
    'QR guest ordering',
    'Captain and mobile operations',
    'External OTA network',
    'Multiple payment modes',
    'Payment gateway automation',
    'Split billing and discounts',
    'Vendor management',
    'Guest feedback',
    'Automated email and WhatsApp',
    'Expenses and profit/loss',
    'Privacy and data rights',
    'Operational documents',
    'Tally/XML integration',
  ]) {
    assert.ok(names.has(required), `${required} must remain visible in the PMS catalogue`);
  }
});

test('provider dependencies are never presented as operational', () => {
  for (const code of ['ON', 'NM', 'PG', 'TP']) {
    assert.notEqual(getPmsModule(code)?.status, 'LIVE');
  }
});

test('provider-independent payment recording is operational', () => {
  const paymentModes = getPmsModule('MP');
  assert.equal(paymentModes?.status, 'LIVE');
  assert.equal(paymentModes?.href, '/partner/pms/payment-modes');
});
