export const PRIVACY_REQUEST_TYPES = ['ACCESS', 'CORRECTION', 'DELETION', 'RESTRICTION'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return PRIVACY_REQUEST_TYPES.some((item) => item === value);
}

export function privacyRequestDueAt(now = new Date()): Date {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000);
}

export const PRIVACY_REQUEST_STATUSES = ['OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED'] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REVIEW_ACTIONS = ['START_REVIEW', 'COMPLETE', 'REJECT', 'REOPEN'] as const;
export type PrivacyReviewAction = (typeof PRIVACY_REVIEW_ACTIONS)[number];

const TRANSITIONS: Record<
  PrivacyRequestStatus,
  Partial<Record<PrivacyReviewAction, PrivacyRequestStatus>>
> = {
  OPEN: { START_REVIEW: 'IN_REVIEW' },
  IN_REVIEW: { COMPLETE: 'COMPLETED', REJECT: 'REJECTED' },
  COMPLETED: { REOPEN: 'IN_REVIEW' },
  REJECTED: { REOPEN: 'IN_REVIEW' },
};

export function privacyRequestTransition(status: string, action: string) {
  if (!PRIVACY_REQUEST_STATUSES.some((item) => item === status)) return null;
  if (!PRIVACY_REVIEW_ACTIONS.some((item) => item === action)) return null;
  return TRANSITIONS[status as PrivacyRequestStatus][action as PrivacyReviewAction] ?? null;
}

export function normalizePrivacyResolutionNote(value: unknown) {
  if (typeof value !== 'string') return null;
  const note = value.trim();
  return note.length >= 10 && note.length <= 500 ? note : null;
}
