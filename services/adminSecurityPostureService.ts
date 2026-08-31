type SearchValue = string | string[] | undefined;

const ACTIONS = new Set([
  'ALL',
  'AI_TRIP_PLAN',
  'ANALYTICS_EVENT',
  'CUSTOMER_SUPPORT_CREATE',
  'LOGIN',
  'MFA_MUTATION',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET_CONFIRM',
  'PASSWORD_RESET_REQUEST',
  'REGISTER',
]);
const STATES = new Set(['ALL', 'ACTIVE_BLOCK', 'EXPIRED_BLOCK', 'OBSERVED']);

export const ADMIN_SECURITY_PAGE_SIZE = 25;
export const ADMIN_SECURITY_RESULT_LIMIT = 1000;

export type AdminSecurityFilters = {
  action: string;
  page: number;
  state: string;
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

export function normalizeAdminSecurityFilters(values: {
  action?: SearchValue;
  page?: SearchValue;
  state?: SearchValue;
}): AdminSecurityFilters {
  return {
    action: selected(values.action, ACTIONS),
    page: positivePage(values.page),
    state: selected(values.state, STATES),
  };
}

export function rateLimitPosture(blockedUntil: Date | null, now: Date) {
  if (!blockedUntil) return 'OBSERVED';
  return blockedUntil > now ? 'ACTIVE_BLOCK' : 'EXPIRED_BLOCK';
}

export function securityCoverage(enabled: number, total: number) {
  if (!Number.isSafeInteger(enabled) || !Number.isSafeInteger(total) || enabled < 0 || total <= 0)
    return 0;
  return Math.min(100, Math.round((enabled / total) * 100));
}

export function adminSecurityPath(filters: AdminSecurityFilters, page: number) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.action !== 'ALL') query.set('action', filters.action);
  if (filters.state !== 'ALL') query.set('state', filters.state);
  return `/admin/security?${query.toString()}`;
}
