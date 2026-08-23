import assert from 'node:assert/strict';
import test from 'node:test';

import { inventorySourceLabel } from '../lib/inventory/sourceLabels.ts';
import { formatLocalCalendarDate, offsetLocalCalendarDate } from '../utils/localDate.ts';

test('inventory provenance names the local PMS and external API paths explicitly', () => {
  assert.equal(inventorySourceLabel('direct'), 'Mandyal PMS/local inventory');
  assert.equal(inventorySourceLabel('supplier'), 'External API supplier inventory');
});

test('calendar formatting preserves positive-offset local dates without UTC rollback', () => {
  const localMidnight = new Date(2026, 7, 23, 0, 30);
  assert.equal(formatLocalCalendarDate(localMidnight), '2026-08-23');
  assert.equal(offsetLocalCalendarDate('2026-08-23', 1), '2026-08-24');
});
