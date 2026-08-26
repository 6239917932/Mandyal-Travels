import 'server-only';

import { createHash } from 'node:crypto';

import type { Prisma } from '@/generated/prisma/client';
import { calculatePromotion, type PromotionProduct } from '@/constants/promotionRules';
import { readPromotionProducts } from '@/services/adminPromotionWorkbenchService';
import {
  isConfirmedFullRefund,
  isPromotionAuthorizationWithinWindow,
} from '@/services/promotionRedemptionRules';

export type PromotionRedemptionTransaction = Prisma.TransactionClient;

export class PromotionRedemptionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PromotionRedemptionError';
  }
}

type ReservationInput = Readonly<{
  claimKey: string;
  code?: string;
  currency: string;
  expiresAt: Date;
  productType: PromotionProduct;
  subtotal: number;
  userId?: string;
}>;

type ClaimSnapshot = Readonly<{
  campaignId: string;
  claimKey: string;
  code: string;
  contextHash: string;
  currency: string;
  discountAmount: number;
  expiresAt: Date;
  finalTotal: number;
  id: string;
  productType: string;
  ruleVersion: number;
  status: string;
  subtotal: number;
  userId: string | null;
}>;

export function promotionClaimContextHash(input: ReservationInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        claimKey: input.claimKey,
        code: input.code?.trim().toUpperCase() ?? null,
        currency: input.currency,
        productType: input.productType,
        subtotal: input.subtotal,
        userId: input.userId ?? null,
      }),
    )
    .digest('hex');
}

export async function releaseExpiredPromotionClaims(
  transaction: PromotionRedemptionTransaction,
  campaignId: string,
  now: Date,
) {
  const expired = await transaction.promotionRedemption.findMany({
    select: { id: true },
    where: { campaignId, expiresAt: { lte: now }, status: 'RESERVED' },
  });
  for (const claim of expired) {
    const released = await transaction.promotionRedemption.updateMany({
      data: { releasedAt: now, status: 'RELEASED' },
      where: { id: claim.id, status: 'RESERVED' },
    });
    if (released.count === 1) {
      const decremented = await transaction.promotionCampaign.updateMany({
        data: { usageCount: { decrement: 1 } },
        where: { id: campaignId, usageCount: { gt: 0 } },
      });
      if (decremented.count !== 1) {
        throw new PromotionRedemptionError(
          'PROMOTION_USAGE_INCONSISTENT',
          'The promotion usage count requires administrator reconciliation.',
        );
      }
    }
  }
}

export async function releaseExpiredPromotionClaimsBatch(
  transaction: PromotionRedemptionTransaction,
  now: Date,
  batchSize: number,
): Promise<number> {
  const expired = await transaction.promotionRedemption.findMany({
    orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    select: { campaignId: true, id: true },
    take: batchSize,
    where: { expiresAt: { lte: now }, status: 'RESERVED' },
  });
  let releasedCount = 0;
  for (const claim of expired) {
    const released = await transaction.promotionRedemption.updateMany({
      data: { releasedAt: now, status: 'RELEASED' },
      where: { id: claim.id, status: 'RESERVED' },
    });
    if (released.count !== 1) continue;
    const decremented = await transaction.promotionCampaign.updateMany({
      data: { usageCount: { decrement: 1 } },
      where: { id: claim.campaignId, usageCount: { gt: 0 } },
    });
    if (decremented.count !== 1) {
      throw new PromotionRedemptionError(
        'PROMOTION_USAGE_INCONSISTENT',
        'The promotion usage count requires administrator reconciliation.',
      );
    }
    releasedCount += 1;
  }
  return releasedCount;
}

function assertSameClaim(existing: ClaimSnapshot, input: ReservationInput) {
  if (existing.contextHash !== promotionClaimContextHash(input)) {
    throw new PromotionRedemptionError(
      'PROMOTION_CLAIM_CONTEXT_MISMATCH',
      'This promotion retry key belongs to different checkout details.',
    );
  }
  if (existing.status === 'RELEASED' || existing.status === 'REVERSED') {
    throw new PromotionRedemptionError(
      'PROMOTION_CLAIM_EXPIRED',
      'This promotion reservation is no longer available. Revalidate the offer.',
    );
  }
}

export async function reserveStoredPromotion(
  transaction: PromotionRedemptionTransaction,
  input: ReservationInput,
): Promise<ClaimSnapshot | undefined> {
  if (!input.code) return undefined;
  const normalizedCode = input.code.trim().toUpperCase();
  const now = new Date();
  const existing = await transaction.promotionRedemption.findUnique({
    where: { claimKey: input.claimKey },
  });
  if (existing) {
    assertSameClaim(existing, { ...input, code: normalizedCode });
    if (existing.status === 'RESERVED' && existing.expiresAt <= now) {
      const released = await transaction.promotionRedemption.updateMany({
        data: { releasedAt: now, status: 'RELEASED' },
        where: { id: existing.id, status: 'RESERVED' },
      });
      if (released.count === 1) {
        const decremented = await transaction.promotionCampaign.updateMany({
          data: { usageCount: { decrement: 1 } },
          where: { id: existing.campaignId, usageCount: { gt: 0 } },
        });
        if (decremented.count !== 1) {
          throw new PromotionRedemptionError(
            'PROMOTION_USAGE_INCONSISTENT',
            'The promotion usage count requires administrator reconciliation.',
          );
        }
      }
      throw new PromotionRedemptionError(
        'PROMOTION_CLAIM_EXPIRED',
        'This promotion reservation expired. Revalidate the offer.',
      );
    }
    return existing;
  }

  const campaign = await transaction.promotionCampaign.findUnique({
    where: { code: normalizedCode },
  });
  if (!campaign) return undefined;
  await releaseExpiredPromotionClaims(transaction, campaign.id, now);

  const products = readPromotionProducts(campaign.productsJson);
  if (
    !campaign.active ||
    campaign.startsAt > now ||
    campaign.endsAt < now ||
    !products.includes(input.productType) ||
    input.subtotal < campaign.minimumSubtotal
  ) {
    throw new PromotionRedemptionError(
      'PROMOTION_NOT_AVAILABLE',
      'This promotion is no longer available for the selected booking.',
    );
  }

  const claimed = await transaction.promotionCampaign.updateMany({
    data: { usageCount: { increment: 1 } },
    where: {
      active: true,
      endsAt: { gte: now },
      id: campaign.id,
      startsAt: { lte: now },
      version: campaign.version,
      ...(campaign.usageLimit === null ? {} : { usageCount: { lt: campaign.usageLimit } }),
    },
  });
  if (claimed.count !== 1) {
    throw new PromotionRedemptionError(
      'PROMOTION_USAGE_EXHAUSTED',
      'This promotion has reached its usage limit. Review the price without the offer.',
    );
  }

  const application = calculatePromotion(
    {
      active: true,
      code: campaign.code,
      maxDiscount: campaign.maximumDiscount,
      minimumSubtotal: campaign.minimumSubtotal,
      percentOff: campaign.percentOff,
      products,
      version: campaign.version,
    },
    input.subtotal,
  );
  return transaction.promotionRedemption.create({
    data: {
      campaignId: campaign.id,
      claimKey: input.claimKey,
      code: campaign.code,
      contextHash: promotionClaimContextHash({ ...input, code: normalizedCode }),
      currency: input.currency,
      discountAmount: application.discountAmount,
      expiresAt: input.expiresAt,
      finalTotal: application.finalTotal,
      productType: input.productType,
      ruleVersion: campaign.version,
      subtotal: input.subtotal,
      userId: input.userId,
    },
  });
}

export async function redeemPromotion(
  transaction: PromotionRedemptionTransaction,
  input: Readonly<{
    bookingId?: string;
    checkoutIntentId?: string;
    claimKey?: string;
    customerTripId?: string;
    finalTotal: number;
    authorizedAt?: Date;
  }>,
) {
  const claim = input.checkoutIntentId
    ? await transaction.promotionRedemption.findUnique({
        where: { checkoutIntentId: input.checkoutIntentId },
      })
    : input.claimKey
      ? await transaction.promotionRedemption.findUnique({ where: { claimKey: input.claimKey } })
      : null;
  if (!claim) return undefined;
  if (claim.finalTotal !== input.finalTotal) {
    throw new PromotionRedemptionError(
      'PROMOTION_TOTAL_MISMATCH',
      'The promotion total changed. Review the booking price again.',
    );
  }
  if (claim.status === 'REDEEMED') {
    if (
      claim.bookingId === (input.bookingId ?? null) &&
      claim.customerTripId === (input.customerTripId ?? null)
    )
      return claim;
    throw new PromotionRedemptionError(
      'PROMOTION_CLAIM_ALREADY_USED',
      'This promotion reservation was already used for another booking.',
    );
  }
  const authorizedAt = input.authorizedAt ?? new Date();
  if (
    claim.status !== 'RESERVED' ||
    !isPromotionAuthorizationWithinWindow(claim.expiresAt, authorizedAt)
  ) {
    throw new PromotionRedemptionError(
      'PROMOTION_CLAIM_EXPIRED',
      'This promotion reservation expired. Review the booking price again.',
    );
  }
  const redeemed = await transaction.promotionRedemption.updateMany({
    data: {
      bookingId: input.bookingId,
      customerTripId: input.customerTripId,
      redeemedAt: new Date(),
      status: 'REDEEMED',
    },
    where: { id: claim.id, status: 'RESERVED' },
  });
  if (redeemed.count !== 1) {
    throw new PromotionRedemptionError(
      'PROMOTION_CLAIM_ALREADY_USED',
      'This promotion reservation was already used for another booking.',
    );
  }
  return transaction.promotionRedemption.findUnique({ where: { id: claim.id } });
}

export async function validateReservedPromotion(
  transaction: PromotionRedemptionTransaction,
  input: ReservationInput & Readonly<{ finalTotal: number; reservationToken: string }>,
) {
  if (input.claimKey !== input.reservationToken) {
    throw new PromotionRedemptionError(
      'PROMOTION_RESERVATION_INVALID',
      'Revalidate the promotion before completing payment.',
    );
  }
  const claim = await transaction.promotionRedemption.findUnique({
    where: { claimKey: input.reservationToken },
  });
  if (!claim) {
    throw new PromotionRedemptionError(
      'PROMOTION_RESERVATION_REQUIRED',
      'Reserve the promotion before completing payment.',
    );
  }
  assertSameClaim(claim, input);
  if (
    claim.status !== 'RESERVED' ||
    claim.expiresAt < new Date() ||
    claim.finalTotal !== input.finalTotal
  ) {
    throw new PromotionRedemptionError(
      'PROMOTION_RESERVATION_EXPIRED',
      'The promotion reservation expired or changed. Review the price again before payment.',
    );
  }
  return claim;
}

export async function reversePromotionForBooking(
  transaction: PromotionRedemptionTransaction,
  bookingId: string,
  reason: string,
) {
  const claim = await transaction.promotionRedemption.findUnique({ where: { bookingId } });
  if (!claim || claim.status !== 'REDEEMED') return false;
  const reversed = await transaction.promotionRedemption.updateMany({
    data: { reversalReason: reason, reversedAt: new Date(), status: 'REVERSED' },
    where: { id: claim.id, status: 'REDEEMED' },
  });
  if (reversed.count !== 1) return false;
  await transaction.promotionCampaign.update({
    data: { usageCount: { decrement: 1 } },
    where: { id: claim.campaignId },
  });
  return true;
}

export async function reversePromotionForConfirmedFullRefund(
  transaction: PromotionRedemptionTransaction,
  input: Readonly<{ bookingId: string; paymentAmount: number; paymentId: string; reason: string }>,
) {
  const approved = await transaction.refundRequest.aggregate({
    _sum: { amount: true },
    where: { paymentId: input.paymentId, status: 'APPROVED' },
  });
  if (!isConfirmedFullRefund(input.paymentAmount, approved._sum.amount ?? 0)) return false;
  return reversePromotionForBooking(transaction, input.bookingId, input.reason);
}
