import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countPmsModules,
  getPmsModule,
  getPmsModuleHref,
  pmsModuleGroups,
  pmsModules,
} from '../lib/pms/moduleRegistry.ts';

test('PMS module names are unique and every live module has a destination', () => {
  assert.equal(new Set(pmsModules.map((module) => module.name)).size, pmsModules.length);
  assert.ok(pmsModules.filter((module) => module.status === 'LIVE').every((module) => module.href));
  assert.ok(pmsModules.every((module) => getPmsModuleHref(module).startsWith('/partner/')));
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
  assert.equal(pmsModules.length, 32);
  assert.equal(pmsModuleGroups.length, 7);
  assert.ok(countPmsModules('LIVE') >= 5);
  assert.ok(countPmsModules('FOUNDATION') >= 3);
  assert.ok(countPmsModules('PLANNED') >= 5);
  assert.deepEqual([...new Set(pmsModules.map((module) => module.phase))], [1, 2, 3, 4]);
});

test('PMS registry contains every approved operational navigation area', () => {
  const names = new Set(pmsModules.map((module) => module.name));
  for (const required of [
    'Owner overview',
    'Room rack',
    'Walk-in booking',
    'Night audit',
    'Point of sale',
    'Kitchen display',
    'Banquets and events',
    'Attendant view',
    'Laundry',
    'Maintenance',
    'Central reservations',
    'Booking engine',
    'Billing and cashier',
    'GST billing',
    'Accounting and ledgers',
    'Stock and inventory',
    'Procurement',
    'Fixed assets',
    'Guest CRM',
    'Guest portal',
    'Telephone and EPABX',
    'Analytics and KPI',
    'HR and payroll',
    'Access control',
  ]) {
    assert.ok(names.has(required), `${required} must remain visible in the PMS catalogue`);
  }
});
