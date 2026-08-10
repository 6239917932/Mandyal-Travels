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
];
