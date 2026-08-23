const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTIONS = new Set(['SAVE_DRAFT', 'PUBLISH', 'UNPUBLISH']);

export type DestinationContentAction = 'SAVE_DRAFT' | 'PUBLISH' | 'UNPUBLISH';

export type DestinationContentInput = {
  action: DestinationContentAction;
  bestTimeToVisit: string;
  country: string;
  expectedVersion: number;
  heroImageUrl: string;
  highlights: string[];
  introduction: string;
  name: string;
  reason: string;
  slug: string;
  state: string;
  summary: string;
  travelTips: string[];
};

type ContentReadiness = Omit<DestinationContentInput, 'action' | 'expectedVersion' | 'reason'>;

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function lines(value: unknown) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n/)
      : [];
  return [...new Set(entries.map((entry) => text(entry, 160)).filter(Boolean))].slice(0, 12);
}

function safeImageUrl(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function destinationContentMissingFields(content: ContentReadiness) {
  const missing: string[] = [];
  if (content.introduction.length < 80) missing.push('introduction of at least 80 characters');
  if (!safeImageUrl(content.heroImageUrl)) missing.push('HTTPS or local hero image');
  if (content.bestTimeToVisit.length < 10) missing.push('best time to visit');
  if (content.highlights.length < 2) missing.push('at least two highlights');
  if (content.travelTips.length < 2) missing.push('at least two travel tips');
  return missing;
}

export function normalizeDestinationContentInput(
  value: Record<string, unknown>,
): DestinationContentInput | null {
  const action = text(value.action, 20).toUpperCase();
  const expectedVersion = Number(value.expectedVersion);
  const input: DestinationContentInput = {
    action: ACTIONS.has(action) ? (action as DestinationContentAction) : 'SAVE_DRAFT',
    bestTimeToVisit: text(value.bestTimeToVisit, 240),
    country: text(value.country, 80) || 'India',
    expectedVersion:
      Number.isSafeInteger(expectedVersion) && expectedVersion >= 0 ? expectedVersion : -1,
    heroImageUrl: text(value.heroImageUrl, 1000),
    highlights: lines(value.highlights),
    introduction: text(value.introduction, 3000),
    name: text(value.name, 100),
    reason: text(value.reason, 500),
    slug: text(value.slug, 80).toLowerCase(),
    state: text(value.state, 100),
    summary: text(value.summary, 240),
    travelTips: lines(value.travelTips),
  };
  if (
    input.expectedVersion < 0 ||
    input.name.length < 2 ||
    !SLUG_PATTERN.test(input.slug) ||
    input.state.length < 2 ||
    input.country.length < 2 ||
    input.summary.length < 30 ||
    input.reason.length < 10
  ) {
    return null;
  }
  if (input.action === 'PUBLISH' && destinationContentMissingFields(input).length) return null;
  if (input.heroImageUrl && !safeImageUrl(input.heroImageUrl)) return null;
  return input;
}

export function destinationContentStatus(
  currentStatus: string | undefined,
  action: DestinationContentAction,
) {
  if (action === 'PUBLISH') return 'PUBLISHED';
  if (action === 'UNPUBLISH') return 'DRAFT';
  return currentStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
}

export function parseDestinationContentList(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
