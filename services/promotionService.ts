import {
  findPromotionRule,
  type PromotionProduct,
  type PromotionRule,
} from '@/constants/promotionRules';
import { prisma } from '@/lib/prisma';

const PRODUCTS = new Set<PromotionProduct>(['FLIGHT', 'HOTEL', 'BUS', 'CAR']);

function readProducts(value: string): PromotionProduct[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (product): product is PromotionProduct =>
        typeof product === 'string' && PRODUCTS.has(product as PromotionProduct),
    );
  } catch {
    return [];
  }
}

export async function resolvePromotionRule(
  code: string,
  productType: PromotionProduct,
): Promise<PromotionRule | undefined> {
  const normalizedCode = code.trim().toUpperCase();
  const now = new Date();
  const campaign = await prisma.promotionCampaign.findFirst({
    where: { active: true, code: normalizedCode, endsAt: { gte: now }, startsAt: { lte: now } },
  });
  if (!campaign) return findPromotionRule(normalizedCode, productType);
  const products = readProducts(campaign.productsJson);
  if (!products.includes(productType)) return undefined;
  return {
    active: campaign.active,
    code: campaign.code,
    maxDiscount: campaign.maximumDiscount,
    minimumSubtotal: campaign.minimumSubtotal,
    percentOff: campaign.percentOff,
    products,
    version: campaign.version,
  };
}

export function normalizePromotionProducts(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.map(String).map((item) => item.trim().toUpperCase()))].filter(
    (item): item is PromotionProduct => PRODUCTS.has(item as PromotionProduct),
  );
}
