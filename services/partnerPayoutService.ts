import 'server-only';

import { prisma } from '@/lib/prisma';
import type { PayoutAccountReviewAction } from '@/services/partnerPayoutRules';

const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,199}$/;

export class PartnerPayoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PartnerPayoutError';
  }
}

export const partnerPayoutService = {
  async registerTokenizedAccount(input: {
    accountHolderName: string;
    accountLast4: string;
    actorUserId: string;
    bankName: string;
    partnerId: string;
    provider: string;
    providerBeneficiaryRef: string;
    reason: string;
    routingCodeMasked?: string;
  }) {
    const partner = await prisma.supplyPartner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new PartnerPayoutError('PARTNER_NOT_FOUND', 'Supplier was not found.');
    if (
      !SAFE_REFERENCE.test(input.providerBeneficiaryRef) ||
      !/^[a-z0-9][a-z0-9_-]{0,49}$/.test(input.provider) ||
      !/^\d{4}$/.test(input.accountLast4)
    ) {
      throw new PartnerPayoutError(
        'PAYOUT_ACCOUNT_INVALID',
        'Use a provider token and only the final four account digits. Raw bank details are rejected.',
      );
    }
    const accountHolderName = input.accountHolderName.trim().replace(/\s+/g, ' ').slice(0, 120);
    const bankName = input.bankName.trim().replace(/\s+/g, ' ').slice(0, 120);
    const reason = input.reason.trim().replace(/\s+/g, ' ');
    if (
      accountHolderName.length < 2 ||
      bankName.length < 2 ||
      reason.length < 10 ||
      reason.length > 500
    ) {
      throw new PartnerPayoutError(
        'PAYOUT_ACCOUNT_INVALID',
        'Account holder, bank, and a 10-500 character import reason are required.',
      );
    }
    return prisma.$transaction(async (transaction) => {
      const account = await transaction.partnerPayoutAccount.create({
        data: {
          accountHolderName,
          accountLast4: input.accountLast4,
          bankName,
          partnerId: input.partnerId,
          provider: input.provider,
          providerBeneficiaryRef: input.providerBeneficiaryRef,
          routingCodeMasked: input.routingCodeMasked?.trim().slice(0, 40) ?? '',
        },
      });
      await transaction.partnerPayoutAccountEvent.create({
        data: {
          action: 'IMPORTED_TOKENIZED_DESTINATION',
          actorUserId: input.actorUserId,
          fromStatus: 'NONE',
          payoutAccountId: account.id,
          reason,
          toStatus: account.status,
          version: account.version,
        },
      });
      return account;
    });
  },

  async reviewAccount(input: {
    accountId: string;
    action: PayoutAccountReviewAction;
    actorUserId: string;
    expectedVersion: number;
    reason: string;
  }) {
    return prisma.$transaction(async (transaction) => {
      const account = await transaction.partnerPayoutAccount.findUnique({
        where: { id: input.accountId },
      });
      if (!account)
        throw new PartnerPayoutError('PAYOUT_ACCOUNT_NOT_FOUND', 'Payout account was not found.');
      if (account.version !== input.expectedVersion)
        throw new PartnerPayoutError(
          'PAYOUT_ACCOUNT_CHANGED',
          'This payout destination changed in another session. Refresh and review it again.',
        );
      if (account.status !== 'PENDING_VERIFICATION')
        throw new PartnerPayoutError(
          'PAYOUT_REVIEW_CLOSED',
          'Only a pending payout destination can be reviewed.',
        );
      const nextStatus = input.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
      const reviewedAt = new Date();
      if (input.action === 'VERIFY') {
        const partner = await transaction.supplyPartner.findUnique({
          select: { payoutDestinationVersion: true },
          where: { id: account.partnerId },
        });
        if (!partner) throw new PartnerPayoutError('PARTNER_NOT_FOUND', 'Supplier was not found.');
        const partnerLock = await transaction.supplyPartner.updateMany({
          data: { payoutDestinationVersion: { increment: 1 } },
          where: {
            id: account.partnerId,
            payoutDestinationVersion: partner.payoutDestinationVersion,
          },
        });
        if (partnerLock.count !== 1)
          throw new PartnerPayoutError(
            'PAYOUT_ACCOUNT_CHANGED',
            'Another payout destination decision is in progress. Refresh and review again.',
          );
        const currentDefaults = await transaction.partnerPayoutAccount.findMany({
          select: { id: true, status: true, version: true },
          where: { id: { not: account.id }, isDefault: true, partnerId: account.partnerId },
        });
        for (const currentDefault of currentDefaults) {
          const superseded = await transaction.partnerPayoutAccount.updateMany({
            data: { isDefault: false, version: { increment: 1 } },
            where: {
              id: currentDefault.id,
              isDefault: true,
              version: currentDefault.version,
            },
          });
          if (superseded.count !== 1)
            throw new PartnerPayoutError(
              'PAYOUT_ACCOUNT_CHANGED',
              'The current default payout destination changed. Refresh and review again.',
            );
          await transaction.partnerPayoutAccountEvent.create({
            data: {
              action: 'SUPERSEDED_DEFAULT',
              actorUserId: input.actorUserId,
              fromStatus: currentDefault.status,
              payoutAccountId: currentDefault.id,
              reason: input.reason,
              toStatus: currentDefault.status,
              version: currentDefault.version + 1,
            },
          });
        }
      }
      const result = await transaction.partnerPayoutAccount.updateMany({
        data: {
          isDefault: input.action === 'VERIFY',
          reviewReason: input.reason,
          reviewedAt,
          reviewedByUserId: input.actorUserId,
          status: nextStatus,
          verifiedAt: input.action === 'VERIFY' ? reviewedAt : null,
          version: { increment: 1 },
        },
        where: {
          id: input.accountId,
          status: 'PENDING_VERIFICATION',
          version: input.expectedVersion,
        },
      });
      if (result.count !== 1)
        throw new PartnerPayoutError(
          'PAYOUT_ACCOUNT_CHANGED',
          'This payout destination changed in another session. Refresh and review it again.',
        );
      const nextVersion = input.expectedVersion + 1;
      await transaction.partnerPayoutAccountEvent.create({
        data: {
          action: input.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
          actorUserId: input.actorUserId,
          fromStatus: account.status,
          payoutAccountId: input.accountId,
          reason: input.reason,
          toStatus: nextStatus,
          version: nextVersion,
        },
      });
      return transaction.partnerPayoutAccount.findUniqueOrThrow({
        where: { id: input.accountId },
      });
    });
  },

  async createBatch(input: { currency: string; idempotencyKey: string; settlementIds: string[] }) {
    if (
      !/^payout-[0-9a-f-]{36}$/i.test(input.idempotencyKey) ||
      !/^[A-Z]{3}$/.test(input.currency) ||
      input.settlementIds.length === 0 ||
      input.settlementIds.length > 100 ||
      new Set(input.settlementIds).size !== input.settlementIds.length
    ) {
      throw new PartnerPayoutError('PAYOUT_BATCH_INVALID', 'Payout batch request is invalid.');
    }
    const existing = await prisma.partnerPayoutBatch.findUnique({
      include: { instructions: true },
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
    const settlements = await prisma.partnerSettlement.findMany({
      include: {
        partner: {
          include: {
            payoutAccounts: {
              where: { isDefault: true, status: 'VERIFIED' },
            },
          },
        },
        payoutInstruction: { select: { id: true } },
      },
      where: { id: { in: input.settlementIds }, status: 'APPROVED' },
    });
    if (settlements.length !== input.settlementIds.length) {
      throw new PartnerPayoutError(
        'PAYOUT_SETTLEMENT_NOT_ELIGIBLE',
        'Every settlement must be approved and not already paid.',
      );
    }
    if (
      settlements.some(
        (settlement) =>
          settlement.currency !== input.currency ||
          settlement.payoutInstruction ||
          settlement.partner.payoutAccounts.length !== 1,
      )
    ) {
      throw new PartnerPayoutError(
        'PAYOUT_DESTINATION_NOT_VERIFIED',
        'Each settlement needs one verified default payout destination in the same currency.',
      );
    }
    const totalAmount = settlements.reduce((total, settlement) => total + settlement.netAmount, 0);
    if (totalAmount <= 0)
      throw new PartnerPayoutError('PAYOUT_AMOUNT_INVALID', 'Payout total must be positive.');
    return prisma.partnerPayoutBatch.create({
      data: {
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        instructionCount: settlements.length,
        instructions: {
          create: settlements.map((settlement) => ({
            amount: settlement.netAmount,
            currency: input.currency,
            partnerId: settlement.partnerId,
            payoutAccountId: settlement.partner.payoutAccounts[0]!.id,
            settlementId: settlement.id,
          })),
        },
        totalAmount,
      },
      include: { instructions: true },
    });
  },
};
