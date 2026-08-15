import assert from 'node:assert/strict';
import test from 'node:test';
import { FUTURE_PRODUCT_MODULES, isFutureProductCode } from '../config/futureProducts.ts';

test('future products remain explicitly planned until provider activation', () => {
  assert.equal(
    FUTURE_PRODUCT_MODULES.every(
      (product) => product.status === 'PLANNED' && product.requiresProvider,
    ),
    true,
  );
  assert.equal(isFutureProductCode('TRAINS'), true);
  assert.equal(isFutureProductCode('UNREVIEWED_PRODUCT'), false);
});
