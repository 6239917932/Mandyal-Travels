import assert from 'node:assert/strict';
import test from 'node:test';

import {
  B2B_COMMERCIAL_MAX_AMOUNT,
  B2BCommercialRuleError,
  calculateB2BCommercialSnapshot,
  validateB2BCommercialTerm,
} from '../services/b2bCommercialRules.ts';

const hotelTerm = Object.freeze({
  productType: 'HOTEL',
  currency: 'INR',
  discountBasisPoints: 0,
  markupBasisPoints: 0,
  fixedFeeAmount: 0,
  agentCommissionBasisPoints: 0,
  commissionBasis: 'SOURCE_AMOUNT',
});

function calculate(
  overrides: Record<string, unknown> = {},
  termOverrides: Record<string, unknown> = {},
) {
  return calculateB2BCommercialSnapshot({
    sourceAmount: 10_000,
    currency: 'INR',
    organizationType: 'CORPORATE',
    productType: 'HOTEL',
    term: { ...hotelTerm, ...termOverrides },
    ...overrides,
  });
}

function expectCode(code: B2BCommercialRuleError['code'], callback: () => unknown) {
  assert.throws(
    callback,
    (error: unknown) => error instanceof B2BCommercialRuleError && error.code === code,
  );
}

test('creates an immutable, versioned snapshot for zero-value corporate terms', () => {
  const snapshot = calculate();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.deepEqual(snapshot, {
    version: 1,
    productType: 'HOTEL',
    organizationType: 'CORPORATE',
    currency: 'INR',
    sourceAmount: 10_000,
    discountBasisPoints: 0,
    discountAmount: 0,
    contractedBaseAmount: 10_000,
    markupBasisPoints: 0,
    markupAmount: 0,
    fixedFeeAmount: 0,
    sellAmount: 10_000,
    commissionBasis: 'SOURCE_AMOUNT',
    commissionBasisAmount: 10_000,
    agentCommissionBasisPoints: 0,
    agentCommissionAmount: 0,
    roundingMode: 'HALF_UP',
  });
});

test('applies discount before markup and then adds the fixed fee', () => {
  const snapshot = calculate(
    {},
    { discountBasisPoints: 1_000, markupBasisPoints: 1_000, fixedFeeAmount: 100 },
  );
  assert.equal(snapshot.discountAmount, 1_000);
  assert.equal(snapshot.contractedBaseAmount, 9_000);
  assert.equal(snapshot.markupAmount, 900);
  assert.equal(snapshot.sellAmount, 10_000);
});

test('uses deterministic integer HALF_UP rounding at exact half boundaries', () => {
  const snapshot = calculate(
    { sourceAmount: 3 },
    { discountBasisPoints: 5_000, markupBasisPoints: 5_000, fixedFeeAmount: 1 },
  );
  assert.equal(snapshot.discountAmount, 2);
  assert.equal(snapshot.contractedBaseAmount, 1);
  assert.equal(snapshot.markupAmount, 1);
  assert.equal(snapshot.sellAmount, 3);
});

test('supports source-amount and sell-amount agent commission bases for travel agencies', () => {
  const sourceBasis = calculate(
    { organizationType: 'TRAVEL_AGENCY' },
    { discountBasisPoints: 1_000, agentCommissionBasisPoints: 500 },
  );
  const sellBasis = calculate(
    { organizationType: 'TRAVEL_AGENCY' },
    { discountBasisPoints: 1_000, agentCommissionBasisPoints: 500, commissionBasis: 'SELL_AMOUNT' },
  );
  assert.equal(sourceBasis.agentCommissionAmount, 500);
  assert.equal(sellBasis.commissionBasisAmount, 9_000);
  assert.equal(sellBasis.agentCommissionAmount, 450);
});

test('rejects agent commission for corporate organizations', () => {
  expectCode('CORPORATE_COMMISSION_NOT_ALLOWED', () =>
    calculate({}, { agentCommissionBasisPoints: 1 }),
  );
});

test('rejects product mismatches and closed-catalogue values', () => {
  expectCode('PRODUCT_MISMATCH', () => calculate({}, { productType: 'CAR' }));
  expectCode('INVALID_PRODUCT', () => calculate({ productType: 'TRAIN' }));
  expectCode('INVALID_ORGANIZATION_TYPE', () => calculate({ organizationType: 'ADMIN' }));
});

test('rejects unsupported source and term currencies', () => {
  expectCode('UNSUPPORTED_CURRENCY', () => calculate({ currency: 'USD' }));
  expectCode('UNSUPPORTED_CURRENCY', () => calculate({}, { currency: 'USD' }));
});

test('rejects invalid source amounts', () => {
  for (const sourceAmount of [0, -1, 1.5, Number.NaN, B2B_COMMERCIAL_MAX_AMOUNT + 1]) {
    expectCode('INVALID_SOURCE_AMOUNT', () => calculate({ sourceAmount }));
  }
});

test('rejects out-of-range and fractional rates', () => {
  for (const discountBasisPoints of [-1, 1.5, 10_001]) {
    expectCode('INVALID_DISCOUNT', () => calculate({}, { discountBasisPoints }));
  }
  for (const markupBasisPoints of [-1, 1.5, 10_001]) {
    expectCode('INVALID_MARKUP', () => calculate({}, { markupBasisPoints }));
  }
  for (const agentCommissionBasisPoints of [-1, 1.5, 10_001]) {
    expectCode('INVALID_COMMISSION', () => calculate({}, { agentCommissionBasisPoints }));
  }
});

test('rejects invalid fixed fees and commission bases', () => {
  for (const fixedFeeAmount of [-1, 1.5, B2B_COMMERCIAL_MAX_AMOUNT + 1]) {
    expectCode('INVALID_FIXED_FEE', () => calculate({}, { fixedFeeAmount }));
  }
  expectCode('INVALID_COMMISSION_BASIS', () => calculate({}, { commissionBasis: 'NET_AMOUNT' }));
});

test('fails closed when the calculated sell amount is zero or exceeds the platform bound', () => {
  expectCode('SELL_AMOUNT_OUT_OF_RANGE', () => calculate({}, { discountBasisPoints: 10_000 }));
  expectCode('SELL_AMOUNT_OUT_OF_RANGE', () =>
    calculate(
      { sourceAmount: B2B_COMMERCIAL_MAX_AMOUNT },
      { markupBasisPoints: 1, fixedFeeAmount: 1 },
    ),
  );
});

test('rejects malformed term values and returns a frozen normalized term', () => {
  for (const term of [null, [], 'terms']) {
    expectCode('INVALID_TERM', () => calculate({ term }));
  }
  const normalized = validateB2BCommercialTerm(hotelTerm);
  assert.equal(Object.isFrozen(normalized), true);
  assert.notEqual(normalized, hotelTerm);
  assert.deepEqual(normalized, hotelTerm);
});

test("is deterministic and never mutates the caller's inputs", () => {
  const term = { ...hotelTerm, fixedFeeAmount: 75 };
  const input = {
    sourceAmount: 1_000,
    currency: 'INR',
    organizationType: 'CORPORATE',
    productType: 'HOTEL',
    term,
  };
  const before = structuredClone(input);
  assert.deepEqual(calculateB2BCommercialSnapshot(input), calculateB2BCommercialSnapshot(input));
  assert.deepEqual(input, before);
});
