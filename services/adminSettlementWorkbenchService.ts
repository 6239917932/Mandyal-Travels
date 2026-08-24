import { createHash } from 'node:crypto';

export const ADMIN_SETTLEMENT_PAGE_SIZE = 25;
export const ADMIN_SETTLEMENT_RESULT_LIMIT = 1_000;
export const ADMIN_SETTLEMENT_STATUSES = ['ALL', 'DRAFT', 'APPROVED', 'PAID'] as const;

type SearchValue = string | string[] | undefined;
export type AdminSettlementStatus = (typeof ADMIN_SETTLEMENT_STATUSES)[number];
export type AdminSettlementFilters = {
  page: number;
  query: string;
  status: AdminSettlementStatus;
};

function first(value: SearchValue): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function normalizeAdminSettlementFilters(input: {
  page?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
}): AdminSettlementFilters {
  const parsedPage = Number.parseInt(first(input.page), 10);
  const candidate = first(input.status).trim().toUpperCase();
  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    query: first(input.q).trim().replace(/\s+/g, ' ').slice(0, 100),
    status: ADMIN_SETTLEMENT_STATUSES.includes(candidate as AdminSettlementStatus)
      ? (candidate as AdminSettlementStatus)
      : 'ALL',
  };
}

export function adminSettlementPath(filters: AdminSettlementFilters, page: number): string {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) query.set('q', filters.query);
  if (filters.status !== 'ALL') query.set('status', filters.status);
  return `/admin/settlements?${query.toString()}`;
}

export function normalizeSettlementTransition(input: {
  action?: unknown;
  expectedVersion?: unknown;
  note?: unknown;
  paymentReference?: unknown;
}): {
  action: 'APPROVE' | 'MARK_PAID';
  expectedVersion: number;
  note: string;
  paymentReference?: string;
} | null {
  if (input.action !== 'APPROVE' && input.action !== 'MARK_PAID') return null;
  const expectedVersion =
    typeof input.expectedVersion === 'number' || typeof input.expectedVersion === 'string'
      ? Number(input.expectedVersion)
      : Number.NaN;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return null;
  const note =
    typeof input.note === 'string' ? input.note.trim().replace(/\s+/g, ' ').slice(0, 500) : '';
  if (note.length < 10) return null;
  const paymentReference =
    typeof input.paymentReference === 'string' ? input.paymentReference.trim() : '';
  if (input.action === 'MARK_PAID' && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$/.test(paymentReference))
    return null;
  return {
    action: input.action,
    expectedVersion,
    note,
    ...(input.action === 'MARK_PAID' ? { paymentReference } : {}),
  };
}

export function hasUnresolvedRefund(statuses: readonly string[]): boolean {
  return statuses.some((status) =>
    ['PENDING', 'PROCESSING', 'PROVIDER_FAILED'].includes(status.toUpperCase()),
  );
}

export function privateSettlementReference(reference: string): string {
  if (!reference) return '';
  return `PAY-${createHash('sha256').update(`settlement:${reference}`).digest('hex').slice(0, 10).toUpperCase()}`;
}
