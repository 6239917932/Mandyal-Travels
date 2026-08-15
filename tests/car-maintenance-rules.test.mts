import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeVehicleMaintenance } from '../lib/car/maintenanceRules.ts';

test('vehicle maintenance normalizes bounded operational records', () => {
  assert.deepEqual(
    normalizeVehicleMaintenance({
      category: 'Preventive service',
      costAmount: 2500,
      description: '  Scheduled engine oil and filter service.  ',
      endDate: '2026-09-02',
      startDate: '2026-09-01',
      status: 'SCHEDULED',
      vendor: '  Mandi Motors  ',
    }),
    {
      category: 'Preventive service',
      costAmount: 2500,
      description: 'Scheduled engine oil and filter service.',
      endDate: '2026-09-02',
      startDate: '2026-09-01',
      status: 'SCHEDULED',
      vendor: 'Mandi Motors',
    },
  );
});

test('vehicle maintenance rejects reversed dates and unsafe costs', () => {
  const base = {
    category: 'Repair',
    description: 'Brake repair required.',
    endDate: '2026-09-01',
    startDate: '2026-09-02',
    status: 'IN_PROGRESS',
  };
  assert.throws(() => normalizeVehicleMaintenance(base));
  assert.throws(() =>
    normalizeVehicleMaintenance({ ...base, costAmount: 10_000_001, endDate: '2026-09-03' }),
  );
});
