import { createHash } from 'node:crypto';

export const ADMIN_AUTOMATION_PAGE_SIZE = 25;
export const ADMIN_AUTOMATION_RESULT_LIMIT = 1000;
export const ADMIN_AUTOMATION_STATUSES = ['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export const ADMIN_AUTOMATION_WINDOWS = ['1', '7', '30', '90', 'ALL'] as const;

export type AdminAutomationStatus = (typeof ADMIN_AUTOMATION_STATUSES)[number];
export type AdminAutomationWindow = (typeof ADMIN_AUTOMATION_WINDOWS)[number];
type SearchValue = string | string[] | undefined;

export type AdminAutomationFilters = {
  page: number;
  status: AdminAutomationStatus;
  window: AdminAutomationWindow;
};

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function catalogueValue<const T extends readonly string[]>(
  value: SearchValue,
  catalogue: T,
  fallback: T[number],
): T[number] {
  const candidate = (first(value) ?? '').trim().toUpperCase();
  return catalogue.some((item) => item === candidate) ? (candidate as T[number]) : fallback;
}

export function normalizeAdminAutomationFilters(values: {
  page?: SearchValue;
  status?: SearchValue;
  window?: SearchValue;
}): AdminAutomationFilters {
  const page = Number(first(values.page));
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    status: catalogueValue(values.status, ADMIN_AUTOMATION_STATUSES, 'ALL'),
    window: catalogueValue(values.window, ADMIN_AUTOMATION_WINDOWS, '7'),
  };
}

export function automationWindowStart(window: AdminAutomationWindow, now: Date): Date | null {
  if (window === 'ALL') return null;
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() - Number(window));
  return result;
}

export function adminAutomationPath(filters: AdminAutomationFilters, page: number): string {
  const params = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.window !== '7') params.set('window', filters.window);
  return `/admin/automation?${params.toString()}`;
}

export function privateAutomationReference(correlationId: string): string {
  return createHash('sha256').update(correlationId).digest('hex').slice(0, 12).toUpperCase();
}

export function automationLeasePosture(input: {
  leaseExpiresAt: Date;
  lastStatus: string;
  now: Date;
}): 'ACTIVE' | 'AVAILABLE' | 'ATTENTION' {
  if (input.lastStatus === 'RUNNING' && input.leaseExpiresAt > input.now) return 'ACTIVE';
  if (input.lastStatus === 'RUNNING' || input.lastStatus === 'FAILED') return 'ATTENTION';
  return 'AVAILABLE';
}

export function safeAutomationSummary(summaryJson: string): {
  expiredAvailabilityLocks: number;
  expiredBusSeatHolds: number;
  releasedPromotionClaims: number;
} {
  try {
    const parsed: unknown = JSON.parse(summaryJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    const record = parsed as Record<string, unknown>;
    const value = (key: string) => {
      const candidate = record[key];
      return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0
        ? candidate
        : 0;
    };
    return {
      expiredAvailabilityLocks: value('expiredAvailabilityLocks'),
      expiredBusSeatHolds: value('expiredBusSeatHolds'),
      releasedPromotionClaims: value('releasedPromotionClaims'),
    };
  } catch {
    return {
      expiredAvailabilityLocks: 0,
      expiredBusSeatHolds: 0,
      releasedPromotionClaims: 0,
    };
  }
}
