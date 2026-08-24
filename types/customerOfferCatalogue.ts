import type { PromotionProduct } from '@/constants/promotionRules';

export type CustomerOfferProductLink = {
  action: string;
  href: string;
  label: string;
  product: PromotionProduct;
};

export type CustomerOffer = {
  code: string;
  description: string;
  maximumDiscount: number;
  minimumSubtotal: number;
  percentOff: number;
  products: CustomerOfferProductLink[];
  title: string;
};

export type CustomerOfferCatalogue = {
  catalogueTruncated: boolean;
  offers: CustomerOffer[];
};
