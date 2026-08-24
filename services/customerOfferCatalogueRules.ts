import type { PromotionProduct, PromotionRule } from '@/constants/promotionRules';
import type { CustomerOfferProductLink } from '@/types/customerOfferCatalogue';

export const CUSTOMER_OFFER_RESULT_LIMIT = 100;
export const CUSTOMER_OFFER_PRODUCTS = ['HOTEL', 'FLIGHT', 'BUS', 'CAR'] as const;

const CUSTOMER_OFFER_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;
const CUSTOMER_OFFER_MAXIMUM_DISCOUNT_LIMIT = 10_000_000;
const CUSTOMER_OFFER_MINIMUM_SUBTOTAL_LIMIT = 100_000_000;

const PRODUCT_LINKS: Readonly<Record<PromotionProduct, CustomerOfferProductLink>> = {
  BUS: { action: 'Explore buses', href: '/buses', label: 'Bus', product: 'BUS' },
  CAR: { action: 'Explore cars', href: '/cars', label: 'Car', product: 'CAR' },
  FLIGHT: {
    action: 'Search flights',
    href: '/flights',
    label: 'Flight',
    product: 'FLIGHT',
  },
  HOTEL: { action: 'Search hotels', href: '/hotels', label: 'Hotel', product: 'HOTEL' },
};

export function customerOfferProductLinks(products: readonly PromotionProduct[]) {
  const allowed = new Set(products);
  return CUSTOMER_OFFER_PRODUCTS.filter((product) => allowed.has(product)).map(
    (product) => PRODUCT_LINKS[product],
  );
}

export function customerOfferTitle(products: readonly PromotionProduct[]) {
  const labels = customerOfferProductLinks(products).map((product) => product.label);
  if (labels.length === 0) return 'Travel offer';
  if (labels.length === 1) return `${labels[0]} offer`;
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)} offer`;
}

export function normalizeCustomerOfferCopy(value: string, maximum: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

export function isPublicPromotionRule(rule: PromotionRule | undefined): rule is PromotionRule {
  return Boolean(
    rule?.active &&
    CUSTOMER_OFFER_CODE_PATTERN.test(rule.code) &&
    Number.isSafeInteger(rule.version) &&
    rule.version > 0 &&
    Number.isSafeInteger(rule.percentOff) &&
    rule.percentOff >= 1 &&
    rule.percentOff <= 100 &&
    Number.isSafeInteger(rule.maxDiscount) &&
    rule.maxDiscount > 0 &&
    rule.maxDiscount <= CUSTOMER_OFFER_MAXIMUM_DISCOUNT_LIMIT &&
    Number.isSafeInteger(rule.minimumSubtotal) &&
    rule.minimumSubtotal > 0 &&
    rule.minimumSubtotal <= CUSTOMER_OFFER_MINIMUM_SUBTOTAL_LIMIT &&
    customerOfferProductLinks(rule.products).length > 0,
  );
}
