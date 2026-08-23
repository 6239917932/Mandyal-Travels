import { createHash } from 'node:crypto';

export const ADMIN_RISK_PAGE_SIZE = 25;
export const ADMIN_RISK_RESULT_LIMIT = 1000;

export const ADMIN_RISK_STATUSES = ['ALL', 'OPEN', 'RESOLVED', 'DISMISSED'] as const;
export const ADMIN_RISK_SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export const ADMIN_RISK_WINDOWS = ['7', '30', '90', 'ALL'] as const;

export type AdminRiskStatus = (typeof ADMIN_RISK_STATUSES)[number];
export type AdminRiskSeverity = (typeof ADMIN_RISK_SEVERITIES)[number];
export type AdminRiskWindow = (typeof ADMIN_RISK_WINDOWS)[number];

export type AdminRiskFilters = {
  page: number;
  query: string;
  severity: AdminRiskSeverity;
  status: AdminRiskStatus;
  window: AdminRiskWindow;
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

export function normalizeAdminRiskFilters(values: {
  page?: SearchValue;
  q?: SearchValue;
  severity?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): AdminRiskFilters {
  const parsedPage = Number(first(values.page));
  return {
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    query: (first(values.q) ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
    severity: catalogueValue(values.severity, ADMIN_RISK_SEVERITIES, 'ALL'),
    status: catalogueValue(values.status, ADMIN_RISK_STATUSES, 'OPEN'),
    window: catalogueValue(values.window, ADMIN_RISK_WINDOWS, '30'),
  };
}

export function adminRiskPath(filters: AdminRiskFilters, page: number) {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) params.set('q', filters.query);
  if (filters.severity !== 'ALL') params.set('severity', filters.severity);
  if (filters.status !== 'OPEN') params.set('status', filters.status);
  if (filters.window !== '30') params.set('window', filters.window);
  return `/admin/risk?${params.toString()}`;
}

export function riskWindowStart(window: AdminRiskWindow, now: Date) {
  if (window === 'ALL') return null;
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() - Number(window));
  return value;
}

export function riskReviewPosture(status: string, createdAt: Date, now: Date) {
  if (status !== 'OPEN') return 'REVIEWED' as const;
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  if (ageMs >= 72 * 60 * 60 * 1000) return 'AGING' as const;
  if (ageMs >= 24 * 60 * 60 * 1000) return 'PENDING' as const;
  return 'NEW' as const;
}

export function privateSubjectReference(subjectType: string, subjectId: string) {
  return createHash('sha256')
    .update(`${subjectType}:${subjectId}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

export function redactRiskNarrative(value: string) {
  return value
    .replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email redacted]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[network address redacted]')
    .replace(/\b\d{10,}\b/g, '[identifier redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}
