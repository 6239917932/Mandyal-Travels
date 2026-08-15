import type { Prisma } from '@/generated/prisma/client';

export const RECONCILIATION_STATES = ['MATCHED', 'DISCREPANCY'] as const;
export const REFUND_DECISIONS = ['APPROVE', 'REJECT'] as const;

export type ReconciliationState = (typeof RECONCILIATION_STATES)[number];
export type RefundDecision = (typeof REFUND_DECISIONS)[number];

export function isReconciliationState(value: unknown): value is ReconciliationState {
  return RECONCILIATION_STATES.some((state) => state === value);
}

export function isRefundDecision(value: unknown): value is RefundDecision {
  return REFUND_DECISIONS.some((decision) => decision === value);
}

export function normalizeFinanceNote(value: unknown, maximumLength = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maximumLength);
}

export function normalizeMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function createLedgerData(input: {
  amount: number;
  createdByUserId: string;
  currency: string;
  description: string;
  entryType: 'PAYMENT_CAPTURE' | 'REFUND_APPROVED';
  paymentId?: string;
  reference: string;
  refundId?: string;
}): Prisma.FinancialLedgerEntryUncheckedCreateInput {
  return {
    amount: input.amount,
    createdByUserId: input.createdByUserId,
    currency: input.currency,
    description: input.description,
    entryType: input.entryType,
    paymentId: input.paymentId,
    reference: input.reference,
    refundId: input.refundId,
  };
}
