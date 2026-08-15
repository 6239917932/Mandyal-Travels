import 'server-only';

import { prisma } from '@/lib/prisma';

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
    bankName: string;
    partnerId: string;
    provider: string;
    providerBeneficiaryRef: string;
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
    if (accountHolderName.length < 2 || bankName.length < 2) {
      throw new PartnerPayoutError(
        'PAYOUT_ACCOUNT_INVALID',
        'Account holder and bank are required.',
      );
    }
    return prisma.partnerPayoutAccount.create({
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
  },

  async reviewAccount(accountId: string, action: 'REJECT' | 'VERIFY') {
    const account = await prisma.partnerPayoutAccount.findUnique({ where: { id: accountId } });
    if (!account)
      throw new PartnerPayoutError('PAYOUT_ACCOUNT_NOT_FOUND', 'Payout account was not found.');
    return prisma.$transaction(async (transaction) => {
      if (action === 'VERIFY') {
        await transaction.partnerPayoutAccount.updateMany({
          data: { isDefault: false },
          where: { partnerId: account.partnerId },
        });
      }
      return transaction.partnerPayoutAccount.update({
        data: {
          isDefault: action === 'VERIFY',
          status: action === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
          verifiedAt: action === 'VERIFY' ? new Date() : null,
        },
        where: { id: accountId },
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
