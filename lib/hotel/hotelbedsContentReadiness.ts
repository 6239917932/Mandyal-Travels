export const HOTELBEDS_CONTENT_JOB_KEY = 'HOTELBEDS_CONTENT_CACHE_V1';
export const HOTELBEDS_CONTENT_FRESH_HOURS = 36;
export const HOTELBEDS_CONTENT_STALE_HOURS = 72;

export type HotelbedsContentReadinessState =
  'AGING' | 'FAILED' | 'FRESH' | 'MIGRATION_REQUIRED' | 'NOT_STARTED' | 'RUNNING' | 'STALE';

export interface HotelbedsContentRunRecord {
  completedAt: Date | null;
  errorCode: string;
  failureCount: number;
  processedCount: number;
  startedAt: Date;
  status: string;
  summaryJson: string;
}

export interface HotelbedsContentRunSummary {
  differentialDate?: string;
  fetched: number;
  language: string;
  mode: 'DIFFERENTIAL' | 'INITIAL';
  nextFrom?: number;
  pages: number;
  unchanged: number;
  upserted: number;
}

export interface HotelbedsContentReadiness {
  activePropertyCount: number;
  ageHours?: number;
  lastRun?: HotelbedsContentRunRecord;
  newestFetchedAt?: Date;
  state: Exclude<HotelbedsContentReadinessState, 'MIGRATION_REQUIRED'>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : undefined;
}

export function parseHotelbedsContentRunSummary(
  value: string,
): HotelbedsContentRunSummary | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  const summary = record(parsed);
  if (!summary || (summary.mode !== 'INITIAL' && summary.mode !== 'DIFFERENTIAL')) {
    return undefined;
  }
  const fetched = nonNegativeInteger(summary.fetched);
  const pages = nonNegativeInteger(summary.pages);
  const unchanged = nonNegativeInteger(summary.unchanged);
  const upserted = nonNegativeInteger(summary.upserted);
  const language = typeof summary.language === 'string' ? summary.language : '';
  if (
    fetched === undefined ||
    pages === undefined ||
    unchanged === undefined ||
    upserted === undefined ||
    !/^[A-Z]{3,6}$/.test(language) ||
    unchanged + upserted > fetched
  ) {
    return undefined;
  }
  const nextFrom = summary.nextFrom === undefined ? undefined : positiveInteger(summary.nextFrom);
  if (summary.nextFrom !== undefined && nextFrom === undefined) return undefined;
  const differentialDate =
    typeof summary.differentialDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(summary.differentialDate)
      ? summary.differentialDate
      : undefined;
  if (summary.mode === 'DIFFERENTIAL' && !differentialDate) return undefined;

  return {
    ...(differentialDate ? { differentialDate } : {}),
    fetched,
    language,
    mode: summary.mode,
    ...(nextFrom ? { nextFrom } : {}),
    pages,
    unchanged,
    upserted,
  };
}

export function hotelbedsContentReadiness(input: {
  activePropertyCount: number;
  lastRun?: HotelbedsContentRunRecord;
  newestFetchedAt?: Date;
  now: Date;
}): HotelbedsContentReadiness {
  if (!Number.isSafeInteger(input.activePropertyCount) || input.activePropertyCount < 0) {
    throw new Error('Invalid Hotelbeds content property count.');
  }
  if (Number.isNaN(input.now.getTime())) throw new Error('Invalid readiness time.');
  const evidence = {
    activePropertyCount: input.activePropertyCount,
    ...(input.lastRun ? { lastRun: input.lastRun } : {}),
    ...(input.newestFetchedAt ? { newestFetchedAt: input.newestFetchedAt } : {}),
  };
  if (input.lastRun?.status === 'RUNNING') {
    return { ...evidence, state: 'RUNNING' };
  }
  if (input.lastRun?.status === 'FAILED') {
    return { ...evidence, state: 'FAILED' };
  }
  if (!input.newestFetchedAt || input.activePropertyCount === 0) {
    return { ...evidence, state: 'NOT_STARTED' };
  }
  if (Number.isNaN(input.newestFetchedAt.getTime())) {
    throw new Error('Invalid Hotelbeds content freshness time.');
  }
  const ageHours = Math.max(
    0,
    (input.now.getTime() - input.newestFetchedAt.getTime()) / (60 * 60 * 1_000),
  );
  const state =
    ageHours <= HOTELBEDS_CONTENT_FRESH_HOURS
      ? 'FRESH'
      : ageHours <= HOTELBEDS_CONTENT_STALE_HOURS
        ? 'AGING'
        : 'STALE';
  return { ...evidence, ageHours, state };
}

export function hotelbedsContentReadinessLabel(state: HotelbedsContentReadinessState): string {
  switch (state) {
    case 'FRESH':
      return 'Fresh';
    case 'AGING':
      return 'Refresh due soon';
    case 'STALE':
      return 'Refresh overdue';
    case 'RUNNING':
      return 'Sync running';
    case 'FAILED':
      return 'Last sync failed';
    case 'MIGRATION_REQUIRED':
      return 'Migration required';
    default:
      return 'Not started';
  }
}
