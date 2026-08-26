import {
  findPromotionRule,
  type PromotionProduct,
  type PromotionRule,
} from '@/constants/promotionRules';
import { prisma } from '@/lib/prisma';
import { resolveStoredPromotionRule } from '@/services/adminPromotionWorkbenchService';
import { releaseExpiredPromotionClaims } from '@/services/promotionRedemptionService';

const PRODUCTS = new Set<PromotionProduct>(['FLIGHT', 'HOTEL', 'BUS', 'CAR']);

export async function resolvePromotionRule(
  code: string,
  productType: PromotionProduct,
): Promise<PromotionRule | undefined> {
  const normalizedCode = code.trim().toUpperCase();
  const now = new Date();
  const campaign = await prisma.$transaction(async (transaction) => {
    const stored = await transaction.promotionCampaign.findUnique({
      where: { code: normalizedCode },
    });
    if (!stored) return null;
    await releaseExpiredPromotionClaims(transaction, stored.id, now);
    return transaction.promotionCampaign.findUnique({ where: { id: stored.id } });
  });
  if (!campaign) return findPromotionRule(normalizedCode, productType);
  return resolveStoredPromotionRule(campaign, productType, now);
}

export function normalizePromotionProducts(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.map(String).map((item) => item.trim().toUpperCase()))].filter(
    (item): item is PromotionProduct => PRODUCTS.has(item as PromotionProduct),
  );
}
