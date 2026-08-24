import { createHash } from 'node:crypto';

export function normalizeSearchTerms(values: readonly string[]): string {
  return [
    ...new Set(values.flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean)),
  ]
    .sort()
    .join(' ')
    .slice(0, 8_000);
}

export function projectionVersion(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function boundedCacheKey(namespace: string, value: unknown): string {
  return `mandyal:v1:${namespace}:${projectionVersion(value).slice(0, 32)}`;
}

type HotelProjectionTermsInput = {
  aliases: readonly string[];
  city: string;
  displayName: string;
  district: string;
  locality: string;
  state: string;
  tehsil: string;
};

export function parseProjectionStringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function hotelProjectionSearchTerms(property: HotelProjectionTermsInput): string {
  return normalizeSearchTerms([
    property.displayName,
    property.locality,
    property.tehsil,
    property.city,
    property.district,
    property.state,
    ...property.aliases,
  ]);
}

export function staleHotelProjectionWhere(activePropertyIds: readonly string[]) {
  return {
    entityType: 'HOTEL',
    ...(activePropertyIds.length ? { entityId: { notIn: [...activePropertyIds] } } : {}),
  };
}
