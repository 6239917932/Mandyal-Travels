import type { Prisma } from '@/generated/prisma/client';

export const CUSTOMER_BENEFITS_LEDGER_LIMIT = 25;

export const CUSTOMER_BENEFITS_LAUNCH_NOTICE =
  'Mandyal Benefits is not launched. Earning, redemption, wallet funding, transfers, withdrawals, and referral rewards are unavailable.';

function authenticatedUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) throw new Error('An authenticated user is required.');
  return normalized;
}

export function customerBenefitsAccountWhere(
  userId: string,
): Prisma.LoyaltyAccountWhereUniqueInput {
  return { userId: authenticatedUserId(userId) };
}

export function customerBenefitsReferralWhere(userId: string): Prisma.ReferralCodeWhereInput {
  return { ownerUserId: authenticatedUserId(userId) };
}

export function formatRecordedWalletUnits(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!Number.isSafeInteger(amount) || !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return 'Unavailable';
  }

  return `${amount.toLocaleString('en-IN')} ${normalizedCurrency} units`;
}

export function formatSignedBenefitsUnits(value: number, unit: 'points' | 'wallet') {
  if (!Number.isSafeInteger(value)) return 'Unavailable';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-IN')} ${unit === 'wallet' ? 'wallet units' : 'points'}`;
}

export function publicReferralReadiness(referral: { expiresAt: Date | null } | null) {
  if (!referral) return 'No referral record is reserved for this account.';
  if (referral.expiresAt && referral.expiresAt <= new Date()) {
    return 'A referral record exists but is expired and unavailable.';
  }
  return 'A referral record is reserved, but its code and rewards remain unavailable until launch.';
}
