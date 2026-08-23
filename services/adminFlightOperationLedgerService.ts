type SearchValue = string | string[] | undefined;

const STATUSES = new Set(['ALL', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER']);
const ENVIRONMENTS = new Set(['ALL', 'SANDBOX', 'PRODUCTION']);

export const ADMIN_FLIGHT_OPERATION_PAGE_SIZE = 25;
export const ADMIN_FLIGHT_OPERATION_RESULT_LIMIT = 1000;

export type AdminFlightOperationFilters = {
  environment: string;
  page: number;
  query: string;
  status: string;
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function selected(value: SearchValue, supported: Set<string>, fallback = 'ALL') {
  const normalized = (first(value) ?? fallback).trim().toUpperCase();
  return supported.has(normalized) ? normalized : fallback;
}

function positivePage(value: SearchValue) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizeAdminFlightOperationFilters(values: {
  environment?: SearchValue;
  page?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
}): AdminFlightOperationFilters {
  return {
    environment: selected(values.environment, ENVIRONMENTS),
    page: positivePage(values.page),
    query: (first(values.q) ?? '').trim().slice(0, 100),
    status: selected(values.status, STATUSES),
  };
}

export function flightOperationPosture(status: string, attempts: number) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'DEAD_LETTER' || normalized === 'FAILED') return 'NEEDS_ATTENTION';
  if (normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'PROCESSING') return 'IN_PROGRESS';
  if (normalized === 'QUEUED' && attempts > 0) return 'RETRY_QUEUED';
  if (normalized === 'QUEUED') return 'AWAITING_PROVIDER_ACTIVATION';
  return 'UNKNOWN';
}

export function hasOperationEvidence(value: string) {
  return value.trim().length > 0;
}

export function adminFlightOperationPath(filters: AdminFlightOperationFilters, page: number) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) query.set('q', filters.query);
  if (filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.environment !== 'ALL') query.set('environment', filters.environment);
  return `/admin/integrations/flights?${query.toString()}`;
}
