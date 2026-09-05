export const PAYOUT_ACCOUNT_REVIEW_ACTIONS = ['REJECT', 'VERIFY'] as const;
export type PayoutAccountReviewAction = (typeof PAYOUT_ACCOUNT_REVIEW_ACTIONS)[number];

export function normalizePayoutAccountReview(value: {
  action?: unknown;
  expectedVersion?: unknown;
  reason?: unknown;
}) {
  const action = typeof value.action === 'string' ? value.action.trim().toUpperCase() : '';
  const expectedVersion = Number(value.expectedVersion);
  const reason = typeof value.reason === 'string' ? value.reason.trim().replace(/\s+/g, ' ') : '';
  if (
    !PAYOUT_ACCOUNT_REVIEW_ACTIONS.includes(action as PayoutAccountReviewAction) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return null;
  }
  return { action: action as PayoutAccountReviewAction, expectedVersion, reason };
}

export function maskedPayoutDestination(value: {
  accountLast4: string;
  bankName: string;
  routingCodeMasked: string;
}) {
  const bankName = value.bankName.trim().replace(/\s+/g, ' ').slice(0, 120);
  const accountLast4 = /^\d{4}$/.test(value.accountLast4) ? value.accountLast4 : '••••';
  const routingCodeMasked = value.routingCodeMasked.trim().replace(/\s+/g, ' ').slice(0, 40);
  return {
    account: `•••• ${accountLast4}`,
    bankName: bankName || 'Provider-managed destination',
    routingCodeMasked,
  };
}
