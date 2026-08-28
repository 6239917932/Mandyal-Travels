import { createHash } from 'node:crypto';

export const HOTELBEDS_CONTENT_PAGE_SIZE = 1_000;
export const HOTELBEDS_CONTENT_MAX_PAGES_PER_RUN = 5;
export const HOTELBEDS_CONTENT_MAX_PROPERTY_BYTES = 512 * 1_024;

export interface HotelbedsContentPageInput {
  from: number;
  language?: string;
  lastUpdateTime?: Date;
  to: number;
}

export interface HotelbedsContentPropertyRecord {
  contentHash: string;
  payloadJson: string;
  providerHotelCode: number;
  providerUpdatedAt?: Date;
}

export interface HotelbedsContentPage {
  hotels: readonly HotelbedsContentPropertyRecord[];
  total?: number;
}

export interface HotelbedsContentSyncPlan {
  from: number;
  lastUpdateTime?: Date;
  mode: 'DIFFERENTIAL' | 'INITIAL';
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function boundedPositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be positive.`);
  return value;
}

function contentLanguage(value: string | undefined): string {
  const language = (value ?? 'ENG').trim().toUpperCase();
  if (!/^[A-Z]{3,6}$/.test(language)) throw new Error('Invalid Hotelbeds content language.');
  return language;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  const source = record(value);
  if (!source) return value;
  return Object.fromEntries(
    Object.keys(source)
      .sort()
      .map((key) => [key, canonicalValue(source[key])]),
  );
}

function optionalProviderDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function buildHotelbedsContentPath(input: HotelbedsContentPageInput): string {
  const from = boundedPositiveInteger(input.from, 'Hotelbeds content page start');
  const to = boundedPositiveInteger(input.to, 'Hotelbeds content page end');
  if (to < from || to - from + 1 > HOTELBEDS_CONTENT_PAGE_SIZE) {
    throw new Error(
      `Hotelbeds content pages may contain at most ${HOTELBEDS_CONTENT_PAGE_SIZE} hotels.`,
    );
  }
  const query = new URLSearchParams({
    fields: 'all',
    from: String(from),
    language: contentLanguage(input.language),
    to: String(to),
  });
  if (input.lastUpdateTime) {
    if (Number.isNaN(input.lastUpdateTime.getTime())) {
      throw new Error('Invalid Hotelbeds content differential date.');
    }
    query.set('lastUpdateTime', input.lastUpdateTime.toISOString().slice(0, 10));
  }
  return `/hotel-content-api/1.0/hotels?${query.toString()}`;
}

export function parseHotelbedsContentPage(payload: unknown): HotelbedsContentPage {
  const root = record(payload);
  if (!root || !Array.isArray(root.hotels)) {
    throw new Error('Hotelbeds content response is malformed.');
  }
  if (root.hotels.length > HOTELBEDS_CONTENT_PAGE_SIZE) {
    throw new Error('Hotelbeds content response exceeds the page limit.');
  }
  const seen = new Set<number>();
  const hotels = root.hotels.map((value) => {
    const hotel = record(value);
    const providerHotelCode = hotel?.code;
    if (!Number.isSafeInteger(providerHotelCode) || (providerHotelCode as number) < 1) {
      throw new Error('Hotelbeds content response contains an invalid hotel code.');
    }
    if (seen.has(providerHotelCode as number)) {
      throw new Error('Hotelbeds content response contains a duplicate hotel code.');
    }
    seen.add(providerHotelCode as number);
    const payloadJson = JSON.stringify(canonicalValue(hotel));
    if (Buffer.byteLength(payloadJson, 'utf8') > HOTELBEDS_CONTENT_MAX_PROPERTY_BYTES) {
      throw new Error('Hotelbeds content property exceeds the storage limit.');
    }
    return {
      contentHash: createHash('sha256').update(payloadJson).digest('hex'),
      payloadJson,
      providerHotelCode: providerHotelCode as number,
      providerUpdatedAt: optionalProviderDate(hotel?.lastUpdate),
    };
  });
  const audit = record(root.auditData) ?? record(root.audit);
  const total = audit?.total;
  return {
    hotels,
    ...(Number.isSafeInteger(total) && (total as number) >= 0 ? { total: total as number } : {}),
  };
}

export function boundedHotelbedsContentPages(value: unknown): number {
  if (value === undefined || value === null || value === '') return 1;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > HOTELBEDS_CONTENT_MAX_PAGES_PER_RUN) {
    throw new Error('HOTELBEDS_CONTENT_MAX_PAGES_PER_RUN must be from 1 to 5.');
  }
  return parsed;
}

export function planHotelbedsContentSync(input: {
  cachedCount: number;
  lastSuccessfulCompletedAt?: Date;
  lastSuccessfulSummaryJson?: string;
}): HotelbedsContentSyncPlan {
  if (!Number.isSafeInteger(input.cachedCount) || input.cachedCount < 0) {
    throw new Error('Invalid Hotelbeds content cache count.');
  }
  if (!input.lastSuccessfulCompletedAt) {
    return { from: input.cachedCount + 1, mode: 'INITIAL' };
  }
  if (Number.isNaN(input.lastSuccessfulCompletedAt.getTime())) {
    throw new Error('Invalid Hotelbeds content sync completion date.');
  }
  let previous: unknown;
  try {
    previous = JSON.parse(input.lastSuccessfulSummaryJson ?? '');
  } catch {
    throw new Error('Invalid Hotelbeds content sync evidence.');
  }
  const summary = record(previous);
  if (!summary || (summary.mode !== 'INITIAL' && summary.mode !== 'DIFFERENTIAL')) {
    throw new Error('Invalid Hotelbeds content sync evidence.');
  }
  if (summary.mode === 'INITIAL' && summary.nextFrom !== undefined) {
    return {
      from: boundedPositiveInteger(Number(summary.nextFrom), 'Hotelbeds content next page'),
      mode: 'INITIAL',
    };
  }
  if (summary.mode === 'DIFFERENTIAL' && summary.nextFrom !== undefined) {
    const differentialDate = summary.differentialDate;
    if (typeof differentialDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(differentialDate)) {
      throw new Error('Invalid Hotelbeds content sync evidence.');
    }
    const lastUpdateTime = new Date(`${differentialDate}T00:00:00.000Z`);
    if (Number.isNaN(lastUpdateTime.getTime())) {
      throw new Error('Invalid Hotelbeds content sync evidence.');
    }
    return {
      from: boundedPositiveInteger(Number(summary.nextFrom), 'Hotelbeds content next page'),
      lastUpdateTime,
      mode: 'DIFFERENTIAL',
    };
  }
  return {
    from: 1,
    lastUpdateTime: input.lastSuccessfulCompletedAt,
    mode: 'DIFFERENTIAL',
  };
}
