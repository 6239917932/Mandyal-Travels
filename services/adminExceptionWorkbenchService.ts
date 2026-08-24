import { createHash } from 'node:crypto';

export const ADMIN_EXCEPTION_PAGE_SIZE = 25;
export const ADMIN_EXCEPTION_RESULT_LIMIT = 1000;
export const ADMIN_EXCEPTION_STATUSES = [
  'ACTION_REQUIRED',
  'ALL',
  'PENDING',
  'PROCESSING',
  'DEAD_LETTER',
  'DELIVERED',
  'IGNORED',
] as const;
export const ADMIN_EXCEPTION_WINDOWS = ['7', '30', '90', 'ALL'] as const;

export type AdminExceptionStatus = (typeof ADMIN_EXCEPTION_STATUSES)[number];
export type AdminExceptionWindow = (typeof ADMIN_EXCEPTION_WINDOWS)[number];

export type AdminExceptionFilters = {
  page: number;
  query: string;
  status: AdminExceptionStatus;
  window: AdminExceptionWindow;
};

type SearchValue = string | string[] | undefined;

const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

function catalogueValue<const T extends readonly string[]>(
  value: SearchValue,
  catalogue: T,
  fallback: T[number],
): T[number] {
  const candidate = (first(value) ?? '').trim().toUpperCase();
  return catalogue.some((item) => item === candidate) ? (candidate as T[number]) : fallback;
}

export function normalizeAdminExceptionFilters(values: {
  page?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): AdminExceptionFilters {
  const parsedPage = Number(first(values.page));
  return {
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    query: (first(values.q) ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
    status: catalogueValue(values.status, ADMIN_EXCEPTION_STATUSES, 'ACTION_REQUIRED'),
    window: catalogueValue(values.window, ADMIN_EXCEPTION_WINDOWS, '30'),
  };
}

export function adminExceptionPath(filters: AdminExceptionFilters, page: number): string {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) params.set('q', filters.query);
  if (filters.status !== 'ACTION_REQUIRED') params.set('status', filters.status);
  if (filters.window !== '30') params.set('window', filters.window);
  return `/admin/operations?${params.toString()}`;
}

export function exceptionWindowStart(window: AdminExceptionWindow, now: Date): Date | null {
  if (window === 'ALL') return null;
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() - Number(window));
  return value;
}

export function integrationQueuePosture(status: string, attempts: number) {
  if (status === 'DEAD_LETTER') return 'HUMAN_REVIEW' as const;
  if (status === 'PROCESSING') return 'IN_PROGRESS' as const;
  if (status === 'PENDING' && attempts > 0) return 'RETRY_SCHEDULED' as const;
  if (status === 'PENDING') return 'QUEUED' as const;
  return 'CLOSED' as const;
}

export function privateAggregateReference(aggregateType: string, aggregateId: string): string {
  return createHash('sha256')
    .update(`${aggregateType}:${aggregateId}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

export function hasIntegrationErrorEvidence(lastError: string): boolean {
  return lastError.trim().length > 0;
}

export type IntegrationReviewAction = {
  action: 'IGNORE' | 'RETRY';
  expectedUpdatedAt: Date;
  note: string;
};

export function normalizeIntegrationReviewAction(
  value: Record<string, unknown>,
): IntegrationReviewAction | null {
  const action = value.action === 'RETRY' || value.action === 'IGNORE' ? value.action : null;
  const note = typeof value.note === 'string' ? value.note.trim().replace(/\s+/g, ' ') : '';
  const expectedText =
    typeof value.expectedUpdatedAt === 'string' ? value.expectedUpdatedAt.trim() : '';
  const expectedUpdatedAt = new Date(expectedText);
  if (
    !action ||
    note.length < 5 ||
    note.length > 500 ||
    Number.isNaN(expectedUpdatedAt.getTime()) ||
    expectedUpdatedAt.toISOString() !== expectedText
  ) {
    return null;
  }
  return { action, expectedUpdatedAt, note };
}
