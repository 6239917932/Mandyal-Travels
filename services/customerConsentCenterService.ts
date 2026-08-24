export const CUSTOMER_CONSENT_PAGE_SIZE = 20;
export const CUSTOMER_CONSENT_RESULT_LIMIT = 500;
export const CUSTOMER_CONSENT_MAX_PAGE = Math.ceil(
  CUSTOMER_CONSENT_RESULT_LIMIT / CUSTOMER_CONSENT_PAGE_SIZE,
);
export const CUSTOMER_CONSENT_STATUSES = ['ALL', 'GRANTED', 'WITHDRAWN'] as const;

export type CustomerConsentStatus = (typeof CUSTOMER_CONSENT_STATUSES)[number];
export type CustomerConsentFilters = {
  page: number;
  status: CustomerConsentStatus;
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeCustomerConsentFilters(values: {
  page?: SearchValue;
  status?: SearchValue;
}): CustomerConsentFilters {
  const candidateStatus = (first(values.status) ?? '').trim().toUpperCase();
  const status = CUSTOMER_CONSENT_STATUSES.some((item) => item === candidateStatus)
    ? (candidateStatus as CustomerConsentStatus)
    : 'ALL';
  const page = Number(first(values.page));

  return {
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, CUSTOMER_CONSENT_MAX_PAGE) : 1,
    status,
  };
}

export function customerConsentHistoryWhere(userId: string, status: CustomerConsentStatus) {
  return {
    userId,
    ...(status === 'ALL' ? {} : { status }),
  };
}

export function customerConsentPath(filters: CustomerConsentFilters, page: number) {
  const params = new URLSearchParams({
    page: String(Math.min(Math.max(1, page), CUSTOMER_CONSENT_MAX_PAGE)),
  });
  if (filters.status !== 'ALL') params.set('status', filters.status);
  return `/account/consents?${params.toString()}`;
}

export function customerConsentStatus(status: string) {
  if (status === 'GRANTED') return { label: 'Granted', tone: 'positive' } as const;
  if (status === 'WITHDRAWN') return { label: 'Withdrawn', tone: 'neutral' } as const;
  return { label: 'Requires review', tone: 'attention' } as const;
}

export function customerConsentPurpose(purpose: string) {
  return purpose === 'MARKETING_COMMUNICATIONS' ? 'Marketing communications' : 'Recorded consent';
}

export function customerConsentSource(source: string) {
  if (source === 'ACCOUNT_REGISTRATION') return 'Account registration';
  if (source === 'ACCOUNT_PREFERENCES') return 'Account preferences';
  return 'Account record';
}

export function customerConsentPolicyEvidence(policyVersion: string) {
  const normalized = policyVersion
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return {
    label: normalized || 'Recorded version unavailable',
    pendingLegalApproval: /pending[-_ ]legal[-_ ]approval/i.test(normalized),
  };
}

export function customerConsentCurrentPosture(record: { status: string } | null) {
  return record ? customerConsentStatus(record.status) : null;
}
