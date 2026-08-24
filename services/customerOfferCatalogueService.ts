import { findPromotionRule, promotionRules, type PromotionRule } from '@/constants/promotionRules';
import { prisma } from '@/lib/prisma';
import {
  readPromotionProducts,
  resolveStoredPromotionRule,
} from '@/services/adminPromotionWorkbenchService';
import {
  CUSTOMER_OFFER_PRODUCTS,
  CUSTOMER_OFFER_RESULT_LIMIT,
  customerOfferProductLinks,
  customerOfferTitle,
  isPublicPromotionRule,
  normalizeCustomerOfferCopy,
} from '@/services/customerOfferCatalogueRules';
import type { CustomerOffer, CustomerOfferCatalogue } from '@/types/customerOfferCatalogue';

const STORED_CAMPAIGN_SELECT = {
  active: true,
  code: true,
  description: true,
  endsAt: true,
  maximumDiscount: true,
  minimumSubtotal: true,
  name: true,
  percentOff: true,
  productsJson: true,
  startsAt: true,
  usageLimit: true,
  version: true,
} as const;

type StoredCampaign = {
  active: boolean;
  code: string;
  description: string;
  endsAt: Date;
  maximumDiscount: number;
  minimumSubtotal: number;
  name: string;
  percentOff: number;
  productsJson: string;
  startsAt: Date;
  usageLimit: number | null;
  version: number;
};

function resolveStoredProducts(campaign: StoredCampaign, now: Date) {
  const declaredProducts = readPromotionProducts(campaign.productsJson);
  const resolvedProducts = CUSTOMER_OFFER_PRODUCTS.filter((product) =>
    isPublicPromotionRule(resolveStoredPromotionRule(campaign, product, now)),
  );
  if (resolvedProducts.length === 0) return null;

  const rule = resolveStoredPromotionRule(campaign, resolvedProducts[0], now);
  return isPublicPromotionRule(rule) && declaredProducts.length > 0
    ? { products: resolvedProducts, rule }
    : null;
}

function baselineRule(rule: PromotionRule): PromotionRule | undefined {
  const products = CUSTOMER_OFFER_PRODUCTS.filter((product) =>
    isPublicPromotionRule(findPromotionRule(rule.code, product)),
  );
  return products.length > 0 ? { ...rule, products } : undefined;
}

function toCustomerOffer({
  description,
  rule,
  title,
}: {
  description: string;
  rule: PromotionRule;
  title: string;
}): CustomerOffer {
  const products = customerOfferProductLinks(rule.products);
  return {
    code: rule.code,
    description: normalizeCustomerOfferCopy(description, 500),
    maximumDiscount: rule.maxDiscount,
    minimumSubtotal: rule.minimumSubtotal,
    percentOff: rule.percentOff,
    products,
    title: normalizeCustomerOfferCopy(title, 120) || customerOfferTitle(rule.products),
  };
}

export async function getCustomerOfferCatalogue(now = new Date()): Promise<CustomerOfferCatalogue> {
  const baselineCodes = promotionRules.map((rule) => rule.code);
  const [storedBaselineOverrides, additionalStoredCampaigns] = await Promise.all([
    prisma.promotionCampaign.findMany({
      orderBy: { code: 'asc' },
      select: STORED_CAMPAIGN_SELECT,
      where: { code: { in: baselineCodes } },
    }),
    prisma.promotionCampaign.findMany({
      orderBy: { code: 'asc' },
      select: STORED_CAMPAIGN_SELECT,
      take: CUSTOMER_OFFER_RESULT_LIMIT + 1,
      where: { code: { notIn: baselineCodes } },
    }),
  ]);
  const overridesByCode = new Map(
    storedBaselineOverrides.map((campaign) => [campaign.code, campaign]),
  );
  const offers: CustomerOffer[] = [];

  for (const configuredRule of promotionRules) {
    const override = overridesByCode.get(configuredRule.code);
    if (override) {
      const resolved = resolveStoredProducts(override, now);
      if (resolved) {
        offers.push(
          toCustomerOffer({
            description: override.description,
            rule: { ...resolved.rule, products: resolved.products },
            title: override.name,
          }),
        );
      }
      continue;
    }

    const resolved = baselineRule(configuredRule);
    if (resolved && isPublicPromotionRule(resolved)) {
      offers.push(toCustomerOffer({ description: '', rule: resolved, title: '' }));
    }
  }

  for (const campaign of additionalStoredCampaigns.slice(0, CUSTOMER_OFFER_RESULT_LIMIT)) {
    const resolved = resolveStoredProducts(campaign, now);
    if (!resolved) continue;
    offers.push(
      toCustomerOffer({
        description: campaign.description,
        rule: { ...resolved.rule, products: resolved.products },
        title: campaign.name,
      }),
    );
  }

  return {
    catalogueTruncated: additionalStoredCampaigns.length > CUSTOMER_OFFER_RESULT_LIMIT,
    offers: offers.sort((left, right) => left.code.localeCompare(right.code)),
  };
}
