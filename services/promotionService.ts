import {
  findPromotionRule,
  type PromotionProduct,
  type PromotionRule,
} from '@/constants/promotionRules';
import { prisma } from '@/lib/prisma';
import { resolveStoredPromotionRule } from '@/services/adminPromotionWorkbenchService';

const PRODUCTS = new Set<PromotionProduct>(['FLIGHT', 'HOTEL', 'BUS', 'CAR']);

export async function resolvePromotionRule(
  code: string,
  productType: PromotionProduct,
): Promise<PromotionRule | undefined> {
  const normalizedCode = code.trim().toUpperCase();
  const now = new Date();
  const campaign = await prisma.promotionCampaign.findUnique({ where: { code: normalizedCode } });
  if (!campaign) return findPromotionRule(normalizedCode, productType);
  return resolveStoredPromotionRule(campaign, productType, now);
}

export function normalizePromotionProducts(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.map(String).map((item) => item.trim().toUpperCase()))].filter(
    (item): item is PromotionProduct => PRODUCTS.has(item as PromotionProduct),
  );
}
