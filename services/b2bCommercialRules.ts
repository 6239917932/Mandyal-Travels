export const B2B_COMMERCIAL_PRODUCTS = ['HOTEL', 'FLIGHT', 'BUS', 'CAR'] as const;
export const B2B_ORGANIZATION_TYPES = ['CORPORATE', 'TRAVEL_AGENCY'] as const;
export const B2B_COMMISSION_BASES = ['SOURCE_AMOUNT', 'SELL_AMOUNT'] as const;

export type B2BCommercialProduct = (typeof B2B_COMMERCIAL_PRODUCTS)[number];
export type B2BOrganizationType = (typeof B2B_ORGANIZATION_TYPES)[number];
export type B2BCommissionBasis = (typeof B2B_COMMISSION_BASES)[number];

export const B2B_COMMERCIAL_CURRENCY = 'INR' as const;
export const B2B_COMMERCIAL_MAX_AMOUNT = 100_000_000;
export const B2B_COMMERCIAL_MAX_BASIS_POINTS = 10_000;

export type B2BCommercialTerm = Readonly<{
  productType: B2BCommercialProduct;
  currency: typeof B2B_COMMERCIAL_CURRENCY;
  discountBasisPoints: number;
  markupBasisPoints: number;
  fixedFeeAmount: number;
  agentCommissionBasisPoints: number;
  commissionBasis: B2BCommissionBasis;
}>;

export type B2BCommercialCalculationInput = Readonly<{
  sourceAmount: unknown;
  currency: unknown;
  organizationType: unknown;
  productType: unknown;
  term: unknown;
}>;

export type B2BCommercialSnapshot = Readonly<{
  version: 1;
  productType: B2BCommercialProduct;
  organizationType: B2BOrganizationType;
  currency: typeof B2B_COMMERCIAL_CURRENCY;
  sourceAmount: number;
  discountBasisPoints: number;
  discountAmount: number;
  contractedBaseAmount: number;
  markupBasisPoints: number;
  markupAmount: number;
  fixedFeeAmount: number;
  sellAmount: number;
  commissionBasis: B2BCommissionBasis;
  commissionBasisAmount: number;
  agentCommissionBasisPoints: number;
  agentCommissionAmount: number;
  roundingMode: 'HALF_UP';
}>;

export type B2BCommercialRuleErrorCode =
  | 'INVALID_TERM'
  | 'INVALID_PRODUCT'
  | 'PRODUCT_MISMATCH'
  | 'INVALID_ORGANIZATION_TYPE'
  | 'UNSUPPORTED_CURRENCY'
  | 'INVALID_SOURCE_AMOUNT'
  | 'INVALID_DISCOUNT'
  | 'INVALID_MARKUP'
  | 'INVALID_FIXED_FEE'
  | 'INVALID_COMMISSION'
  | 'INVALID_COMMISSION_BASIS'
  | 'CORPORATE_COMMISSION_NOT_ALLOWED'
  | 'SELL_AMOUNT_OUT_OF_RANGE'
  | 'CALCULATION_OVERFLOW';

export class B2BCommercialRuleError extends Error {
  readonly code: B2BCommercialRuleErrorCode;

  constructor(code: B2BCommercialRuleErrorCode, message: string) {
    super(message);
    this.name = 'B2BCommercialRuleError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMember<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function requireBasisPoints(
  value: unknown,
  code: 'INVALID_DISCOUNT' | 'INVALID_MARKUP' | 'INVALID_COMMISSION',
  label: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > B2B_COMMERCIAL_MAX_BASIS_POINTS
  ) {
    throw new B2BCommercialRuleError(
      code,
      `${label} must be an integer between 0 and ${B2B_COMMERCIAL_MAX_BASIS_POINTS}.`,
    );
  }
  return value;
}

function requireAmount(
  value: unknown,
  code: 'INVALID_SOURCE_AMOUNT' | 'INVALID_FIXED_FEE',
  label: string,
  minimum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > B2B_COMMERCIAL_MAX_AMOUNT
  ) {
    throw new B2BCommercialRuleError(
      code,
      `${label} must be a safe integer between ${minimum} and ${B2B_COMMERCIAL_MAX_AMOUNT}.`,
    );
  }
  return value;
}

function halfUpBasisPoints(amount: number, basisPoints: number): number {
  const numerator = amount * basisPoints;
  if (!Number.isSafeInteger(numerator)) {
    throw new B2BCommercialRuleError(
      'CALCULATION_OVERFLOW',
      'Commercial calculation exceeded safe integer bounds.',
    );
  }
  return Math.floor(
    (numerator + B2B_COMMERCIAL_MAX_BASIS_POINTS / 2) / B2B_COMMERCIAL_MAX_BASIS_POINTS,
  );
}

export function validateB2BCommercialTerm(value: unknown): B2BCommercialTerm {
  if (!isRecord(value)) {
    throw new B2BCommercialRuleError('INVALID_TERM', 'Commercial terms must be an object.');
  }
  if (!isMember(B2B_COMMERCIAL_PRODUCTS, value.productType)) {
    throw new B2BCommercialRuleError(
      'INVALID_PRODUCT',
      'Commercial terms contain an unsupported product type.',
    );
  }
  if (value.currency !== B2B_COMMERCIAL_CURRENCY) {
    throw new B2BCommercialRuleError(
      'UNSUPPORTED_CURRENCY',
      'Only INR commercial terms are supported.',
    );
  }
  if (!isMember(B2B_COMMISSION_BASES, value.commissionBasis)) {
    throw new B2BCommercialRuleError(
      'INVALID_COMMISSION_BASIS',
      'Commission basis is unsupported.',
    );
  }

  return Object.freeze({
    productType: value.productType,
    currency: B2B_COMMERCIAL_CURRENCY,
    discountBasisPoints: requireBasisPoints(
      value.discountBasisPoints,
      'INVALID_DISCOUNT',
      'Discount basis points',
    ),
    markupBasisPoints: requireBasisPoints(
      value.markupBasisPoints,
      'INVALID_MARKUP',
      'Markup basis points',
    ),
    fixedFeeAmount: requireAmount(value.fixedFeeAmount, 'INVALID_FIXED_FEE', 'Fixed fee', 0),
    agentCommissionBasisPoints: requireBasisPoints(
      value.agentCommissionBasisPoints,
      'INVALID_COMMISSION',
      'Agent commission basis points',
    ),
    commissionBasis: value.commissionBasis,
  });
}

export function calculateB2BCommercialSnapshot(
  input: B2BCommercialCalculationInput,
): B2BCommercialSnapshot {
  const sourceAmount = requireAmount(
    input.sourceAmount,
    'INVALID_SOURCE_AMOUNT',
    'Source amount',
    1,
  );
  if (input.currency !== B2B_COMMERCIAL_CURRENCY) {
    throw new B2BCommercialRuleError(
      'UNSUPPORTED_CURRENCY',
      'Only INR source prices are supported.',
    );
  }
  if (!isMember(B2B_COMMERCIAL_PRODUCTS, input.productType)) {
    throw new B2BCommercialRuleError('INVALID_PRODUCT', 'Requested product type is unsupported.');
  }
  if (!isMember(B2B_ORGANIZATION_TYPES, input.organizationType)) {
    throw new B2BCommercialRuleError(
      'INVALID_ORGANIZATION_TYPE',
      'Organization type is unsupported.',
    );
  }

  const term = validateB2BCommercialTerm(input.term);
  if (term.productType !== input.productType) {
    throw new B2BCommercialRuleError(
      'PRODUCT_MISMATCH',
      'Commercial terms do not match the requested product.',
    );
  }
  if (input.organizationType === 'CORPORATE' && term.agentCommissionBasisPoints !== 0) {
    throw new B2BCommercialRuleError(
      'CORPORATE_COMMISSION_NOT_ALLOWED',
      'Corporate organizations cannot receive agent commission.',
    );
  }

  const discountAmount = halfUpBasisPoints(sourceAmount, term.discountBasisPoints);
  const contractedBaseAmount = sourceAmount - discountAmount;
  const markupAmount = halfUpBasisPoints(contractedBaseAmount, term.markupBasisPoints);
  const sellAmount = contractedBaseAmount + markupAmount + term.fixedFeeAmount;
  if (!Number.isSafeInteger(sellAmount)) {
    throw new B2BCommercialRuleError(
      'CALCULATION_OVERFLOW',
      'Commercial calculation exceeded safe integer bounds.',
    );
  }
  if (sellAmount < 1 || sellAmount > B2B_COMMERCIAL_MAX_AMOUNT) {
    throw new B2BCommercialRuleError(
      'SELL_AMOUNT_OUT_OF_RANGE',
      `Sell amount must be between 1 and ${B2B_COMMERCIAL_MAX_AMOUNT}.`,
    );
  }

  const commissionBasisAmount =
    term.commissionBasis === 'SOURCE_AMOUNT' ? sourceAmount : sellAmount;
  const agentCommissionAmount = halfUpBasisPoints(
    commissionBasisAmount,
    term.agentCommissionBasisPoints,
  );

  return Object.freeze({
    version: 1,
    productType: input.productType,
    organizationType: input.organizationType,
    currency: B2B_COMMERCIAL_CURRENCY,
    sourceAmount,
    discountBasisPoints: term.discountBasisPoints,
    discountAmount,
    contractedBaseAmount,
    markupBasisPoints: term.markupBasisPoints,
    markupAmount,
    fixedFeeAmount: term.fixedFeeAmount,
    sellAmount,
    commissionBasis: term.commissionBasis,
    commissionBasisAmount,
    agentCommissionBasisPoints: term.agentCommissionBasisPoints,
    agentCommissionAmount,
    roundingMode: 'HALF_UP',
  });
}
