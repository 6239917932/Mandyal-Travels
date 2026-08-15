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
