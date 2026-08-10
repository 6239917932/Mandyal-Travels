export type PromotionProduct = 'FLIGHT' | 'HOTEL' | 'BUS' | 'CAR';

export interface PromotionRule {
  active: boolean;
  code: string;
  maxDiscount: number;
  minimumSubtotal: number;
  percentOff: number;
  products: readonly PromotionProduct[];
  version: number;
}

export interface PromotionApplication {
  code: string;
  discountAmount: number;
  finalTotal: number;
  percentOff: number;
  ruleVersion: number;
}

export const promotionRules: readonly PromotionRule[] = [
  {
    active: true,
    code: 'FLYSMART',
    maxDiscount: 1000,
    minimumSubtotal: 4000,
    percentOff: 10,
    products: ['FLIGHT'],
    version: 1,
  },
  {
    active: true,
    code: 'STAYMORE',
    maxDiscount: 1500,
    minimumSubtotal: 8000,
    percentOff: 12,
    products: ['HOTEL'],
    version: 1,
  },
];

export function findPromotionRule(
  code: string,
  productType: PromotionProduct,
): PromotionRule | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return promotionRules.find(
    (rule) =>
      rule.active &&
      rule.code === normalizedCode &&
      rule.products.includes(productType),
  );
}

export function calculatePromotion(
  rule: PromotionRule,
  subtotal: number,
): PromotionApplication {
  const discountAmount = Math.min(
    Math.floor((subtotal * rule.percentOff) / 100),
    rule.maxDiscount,
  );

  return {
    code: rule.code,
    discountAmount,
    finalTotal: subtotal - discountAmount,
    percentOff: rule.percentOff,
    ruleVersion: rule.version,
  };
}
