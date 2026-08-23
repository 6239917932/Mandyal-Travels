import type { PromotionProduct, PromotionRule } from '@/constants/promotionRules';

export const ADMIN_PROMOTION_PAGE_SIZE = 25;
export const ADMIN_PROMOTION_RESULT_LIMIT = 1000;
export const ADMIN_PROMOTION_STATUSES = [
  'ALL',
  'ACTIVE',
  'SCHEDULED',
  'PAUSED',
  'EXPIRED',
  'BLOCKED_UNTRACKED_CAP',
] as const;
export const ADMIN_PROMOTION_PRODUCTS = ['ALL', 'HOTEL', 'FLIGHT', 'BUS', 'CAR'] as const;

export type AdminPromotionStatus = (typeof ADMIN_PROMOTION_STATUSES)[number];
export type AdminPromotionProduct = (typeof ADMIN_PROMOTION_PRODUCTS)[number];
export type AdminPromotionFilters = {
  page: number;
  product: AdminPromotionProduct;
  query: string;
  status: AdminPromotionStatus;
};

type SearchValue = string | string[] | undefined;

const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

function catalogueValue<const T extends readonly string[]>(
  value: SearchValue,
  catalogue: T,
  fallback: T[number],
): T[number] {
  const candidate = (first(value) ?? '').trim().toUpperCase();
  return catalogue.some((item) => item === candidate) ? (candidate as T[number]) : fallback;
}

export function normalizeAdminPromotionFilters(values: {
  page?: SearchValue;
  product?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
}): AdminPromotionFilters {
  const parsedPage = Number(first(values.page));
  return {
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    product: catalogueValue(values.product, ADMIN_PROMOTION_PRODUCTS, 'ALL'),
    query: (first(values.q) ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
    status: catalogueValue(values.status, ADMIN_PROMOTION_STATUSES, 'ALL'),
  };
}

export function adminPromotionPath(filters: AdminPromotionFilters, page: number) {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) params.set('q', filters.query);
  if (filters.product !== 'ALL') params.set('product', filters.product);
  if (filters.status !== 'ALL') params.set('status', filters.status);
  return `/admin/promotions?${params.toString()}`;
}

export function readPromotionProducts(value: string): PromotionProduct[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed)].filter(
      (product): product is PromotionProduct =>
        typeof product === 'string' && ['HOTEL', 'FLIGHT', 'BUS', 'CAR'].includes(product),
    );
  } catch {
    return [];
  }
}

export function promotionOperationalState(
  campaign: { active: boolean; endsAt: Date; startsAt: Date; usageLimit: number | null },
  now: Date,
): AdminPromotionStatus {
  if (campaign.endsAt < now) return 'EXPIRED';
  if (campaign.usageLimit !== null) return 'BLOCKED_UNTRACKED_CAP';
  if (campaign.startsAt > now) return 'SCHEDULED';
  return campaign.active ? 'ACTIVE' : 'PAUSED';
}

export function promotionActivationBlockReason(
  campaign: { endsAt: Date; productsJson: string; usageLimit: number | null },
  now: Date,
) {
  if (campaign.endsAt <= now) return 'Expired campaigns cannot be activated.';
  if (readPromotionProducts(campaign.productsJson).length === 0)
    return 'Campaign product eligibility is invalid.';
  if (campaign.usageLimit !== null)
    return 'Usage-capped campaigns require persisted redemption tracking before activation.';
  return null;
}

export function normalizePromotionStatusUpdate(value: {
  active?: unknown;
  expectedVersion?: unknown;
  reason?: unknown;
}) {
  const expectedVersion = Number(value.expectedVersion);
  const reason = typeof value.reason === 'string' ? value.reason.trim().replace(/\s+/g, ' ') : '';
  if (
    typeof value.active !== 'boolean' ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    reason.length < 10 ||
    reason.length > 500
  )
    return null;
  return { active: value.active, expectedVersion, reason };
}

export function resolveStoredPromotionRule(
  campaign: {
    active: boolean;
    code: string;
    endsAt: Date;
    maximumDiscount: number;
    minimumSubtotal: number;
    percentOff: number;
    productsJson: string;
    startsAt: Date;
    usageLimit: number | null;
    version: number;
  },
  productType: PromotionProduct,
  now: Date,
): PromotionRule | undefined {
  if (
    promotionOperationalState(campaign, now) !== 'ACTIVE' ||
    !readPromotionProducts(campaign.productsJson).includes(productType)
  )
    return undefined;
  return {
    active: true,
    code: campaign.code,
    maxDiscount: campaign.maximumDiscount,
    minimumSubtotal: campaign.minimumSubtotal,
    percentOff: campaign.percentOff,
    products: readPromotionProducts(campaign.productsJson),
    version: campaign.version,
  };
}
