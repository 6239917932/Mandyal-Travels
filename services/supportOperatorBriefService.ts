export type SupportOperatorBriefKind = 'BUSINESS' | 'CUSTOMER';

export type SupportOperatorBriefInput = {
  bookingReferencePresent: boolean;
  category: string;
  createdAt: Date;
  kind: SupportOperatorBriefKind;
  status: string;
};

export type SupportOperatorBrief = {
  checklist: readonly string[];
  context: readonly string[];
  summary: string;
};

const CATEGORY_LABELS = {
  ACCOUNT: 'Account access',
  BILLING: 'Billing',
  BOOKING: 'Booking servicing',
  OTHER: 'General support',
  PAYMENT: 'Payment',
  TECHNICAL: 'Technical support',
} as const;

type KnownCategory = keyof typeof CATEGORY_LABELS;

const CATEGORY_CHECKS: Record<KnownCategory, string> = {
  ACCOUNT:
    'Verify account ownership with the approved authentication record before discussing or changing access.',
  BILLING:
    'Compare the persisted statement, payment, and refund records; do not infer settlement from a message or provider callback.',
  BOOKING:
    'Verify the current governed booking record before promising a change, cancellation, entitlement, or refund.',
  OTHER: 'Confirm the requested outcome and route it to the responsible human operations owner.',
  PAYMENT:
    'Compare the persisted payment and refund records; do not infer settlement from a message or provider callback.',
  TECHNICAL:
    'Reproduce the reported path safely and record evidence without changing customer, booking, or financial data.',
};

function knownCategory(value: string): KnownCategory {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'ACCOUNT':
    case 'BILLING':
    case 'BOOKING':
    case 'OTHER':
    case 'PAYMENT':
    case 'TECHNICAL':
      return normalized;
    default:
      return 'OTHER';
  }
}

function ageContext(createdAt: Date, now: Date): string {
  const createdAtMs = createdAt.getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs)) return 'Opened date unavailable';
  if (createdAtMs > nowMs) return 'Opened date requires manual verification';

  const elapsedMs = nowMs - createdAtMs;
  const elapsedDays = Math.floor(elapsedMs / 86_400_000);

  if (elapsedDays === 0) return 'Opened today';
  if (elapsedDays <= 2) return 'Opened 1–2 days ago';
  if (elapsedDays <= 6) return 'Opened 3–6 days ago';
  return 'Opened 7 or more days ago';
}

function statusContext(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'OPEN') return 'Awaiting human review';
  if (normalized === 'CLOSED') return 'Recorded as closed';
  return 'Status requires manual verification';
}

export function buildSupportOperatorBrief(
  input: SupportOperatorBriefInput,
  now = new Date(),
): SupportOperatorBrief {
  const category = knownCategory(input.category);
  const context = [
    statusContext(input.status),
    CATEGORY_LABELS[category],
    input.bookingReferencePresent ? 'Booking reference attached' : 'No booking reference attached',
    ageContext(input.createdAt, now),
  ] as const;

  const checklist = [
    input.kind === 'BUSINESS'
      ? 'Confirm the requester still has an active organization membership and authority for the requested action.'
      : 'Confirm the signed-in customer owns the account and any linked booking before disclosing details.',
    input.bookingReferencePresent
      ? 'Open the governed booking record and compare its current status with the request.'
      : 'Ask for only the minimum booking context needed through an approved support channel.',
    CATEGORY_CHECKS[category],
    input.status.trim().toUpperCase() === 'CLOSED'
      ? 'Review the recorded resolution before any human decides whether follow-up is needed.'
      : 'Document the evidence reviewed and the human-approved next step before updating the case.',
  ] as const;

  return {
    checklist,
    context,
    summary: context.join(' · '),
  };
}
