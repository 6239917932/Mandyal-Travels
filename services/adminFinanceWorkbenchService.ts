import { createHash } from 'node:crypto';

export const ADMIN_FINANCE_PAGE_SIZE = 25;
export const ADMIN_FINANCE_RESULT_LIMIT = 1000;
export const ADMIN_PAYMENT_STATUSES = ['ALL', 'captured', 'pending', 'failed'] as const;
export const ADMIN_RECONCILIATION_STATUSES = [
  'ALL',
  'UNRECONCILED',
  'MATCHED',
  'DISCREPANCY',
] as const;
export const ADMIN_REFUND_STATUSES = [
  'ALL',
  'PENDING',
  'PROCESSING',
  'PROVIDER_FAILED',
  'APPROVED',
  'REJECTED',
] as const;
export const ADMIN_FINANCE_WINDOWS = ['7', '30', '90', 'ALL'] as const;

export type AdminPaymentStatus = (typeof ADMIN_PAYMENT_STATUSES)[number];
export type AdminReconciliationStatus = (typeof ADMIN_RECONCILIATION_STATUSES)[number];
export type AdminRefundStatus = (typeof ADMIN_REFUND_STATUSES)[number];
export type AdminFinanceWindow = (typeof ADMIN_FINANCE_WINDOWS)[number];

export type AdminFinanceFilters = {
  paymentPage: number;
  paymentStatus: AdminPaymentStatus;
  query: string;
  reconciliation: AdminReconciliationStatus;
  refundPage: number;
  refundStatus: AdminRefundStatus;
  window: AdminFinanceWindow;
};

type SearchValue = string | string[] | undefined;
type PageUpdate = { paymentPage?: number; refundPage?: number };

const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

function page(value: SearchValue) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function catalogueValue<const T extends readonly string[]>(
  value: SearchValue,
  catalogue: T,
  fallback: T[number],
): T[number] {
  const candidate = (first(value) ?? '').trim();
  const match = catalogue.find((item) => item.toUpperCase() === candidate.toUpperCase());
  return match ?? fallback;
}

export function normalizeAdminFinanceFilters(values: {
  paymentPage?: SearchValue;
  paymentStatus?: SearchValue;
  q?: SearchValue;
  reconciliation?: SearchValue;
  refundPage?: SearchValue;
  refundStatus?: SearchValue;
  window?: SearchValue;
}): AdminFinanceFilters {
  return {
    paymentPage: page(values.paymentPage),
    paymentStatus: catalogueValue(values.paymentStatus, ADMIN_PAYMENT_STATUSES, 'ALL'),
    query: (first(values.q) ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
    reconciliation: catalogueValue(values.reconciliation, ADMIN_RECONCILIATION_STATUSES, 'ALL'),
    refundPage: page(values.refundPage),
    refundStatus: catalogueValue(values.refundStatus, ADMIN_REFUND_STATUSES, 'PENDING'),
    window: catalogueValue(values.window, ADMIN_FINANCE_WINDOWS, '30'),
  };
}

export function adminFinancePath(filters: AdminFinanceFilters, update: PageUpdate) {
  const params = new URLSearchParams({
    paymentPage: String(Math.max(1, update.paymentPage ?? filters.paymentPage)),
    refundPage: String(Math.max(1, update.refundPage ?? filters.refundPage)),
  });
  if (filters.query) params.set('q', filters.query);
  if (filters.paymentStatus !== 'ALL') params.set('paymentStatus', filters.paymentStatus);
  if (filters.reconciliation !== 'ALL') params.set('reconciliation', filters.reconciliation);
  if (filters.refundStatus !== 'PENDING') params.set('refundStatus', filters.refundStatus);
  if (filters.window !== '30') params.set('window', filters.window);
  return `/admin/finance?${params.toString()}`;
}

export function financeWindowStart(window: AdminFinanceWindow, now: Date) {
  if (window === 'ALL') return null;
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() - Number(window));
  return result;
}

export function privateProviderReference(provider: string, providerReference: string) {
  return createHash('sha256')
    .update(`${provider}:${providerReference}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

export function redactFinanceNarrative(value: string) {
  return value
    .replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email redacted]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[network address redacted]')
    .replace(/\b\d{10,}\b/g, '[identifier redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export function canOperateOnPayment(status: string) {
  return status === 'captured';
}

export function refundReviewPosture(status: string) {
  if (status === 'PENDING') return 'REVIEW_REQUIRED' as const;
  if (status === 'PROVIDER_FAILED') return 'RETRY_AVAILABLE' as const;
  if (status === 'PROCESSING') return 'IN_PROGRESS' as const;
  return 'REVIEWED' as const;
}
