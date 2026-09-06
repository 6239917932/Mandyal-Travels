import assert from 'node:assert/strict';
import test from 'node:test';

import { countPmsModules, pmsModules } from '../lib/pms/moduleRegistry.ts';

test('PMS module names are unique and every live module has a destination', () => {
  assert.equal(new Set(pmsModules.map((module) => module.name)).size, pmsModules.length);
  assert.ok(pmsModules.filter((module) => module.status === 'LIVE').every((module) => module.href));
});

test('PMS registry exposes a controlled multi-phase rollout', () => {
  assert.ok(countPmsModules('LIVE') >= 5);
  assert.ok(countPmsModules('FOUNDATION') >= 3);
  assert.ok(countPmsModules('PLANNED') >= 5);
  assert.deepEqual([...new Set(pmsModules.map((module) => module.phase))], [1, 2, 3, 4]);
});
