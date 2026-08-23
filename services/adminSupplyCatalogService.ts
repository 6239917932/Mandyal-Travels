type SearchValue = string | string[] | undefined;

const SOURCES = new Set(['ALL', 'DIRECT', 'EXTERNAL']);
const APPROVAL_STATES = new Set(['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']);
const PUBLICATION_STATES = new Set(['ALL', 'DRAFT', 'PUBLISHED', 'PAUSED']);
const CONTENT_STATES = new Set(['ALL', 'READY', 'NEEDS_ATTENTION']);

export const ADMIN_SUPPLY_CATALOG_PAGE_SIZE = 25;
export const ADMIN_SUPPLY_CATALOG_RESULT_LIMIT = 1000;

export type AdminSupplyCatalogFilters = {
  approval: string;
  content: string;
  page: number;
  publication: string;
  query: string;
  source: string;
};

export type PropertyContentInput = {
  activeRatePlans: number;
  activeRooms: number;
  amenitiesJson: string;
  city: string;
  description: string;
  district: string;
  imageUrl: string;
  imageUrlsJson: string;
  latitude: number;
  locality: string;
  longitude: number;
  policiesJson: string;
  state: string;
  streetAddress: string;
};

export type PropertyContentAssessment = {
  completeChecks: number;
  missing: string[];
  ready: boolean;
  totalChecks: number;
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

function jsonListHasItems(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.some((item) => typeof item === 'string' && item.trim());
  } catch {
    return false;
  }
}

export function normalizeAdminSupplyCatalogFilters(values: {
  approval?: SearchValue;
  content?: SearchValue;
  page?: SearchValue;
  publication?: SearchValue;
  q?: SearchValue;
  source?: SearchValue;
}): AdminSupplyCatalogFilters {
  return {
    approval: selected(values.approval, APPROVAL_STATES),
    content: selected(values.content, CONTENT_STATES),
    page: positivePage(values.page),
    publication: selected(values.publication, PUBLICATION_STATES),
    query: (first(values.q) ?? '').trim().slice(0, 100),
    source: selected(values.source, SOURCES),
  };
}

export function assessPropertyContent(input: PropertyContentInput): PropertyContentAssessment {
  const checks = [
    ['Description', input.description.trim().length >= 30],
    [
      'Location hierarchy',
      Boolean(
        (input.locality.trim() || input.city.trim()) &&
        input.district.trim() &&
        input.state.trim() &&
        input.streetAddress.trim(),
      ),
    ],
    [
      'Map coordinates',
      Number.isFinite(input.latitude) &&
        Number.isFinite(input.longitude) &&
        input.latitude >= -90 &&
        input.latitude <= 90 &&
        input.longitude >= -180 &&
        input.longitude <= 180 &&
        !(input.latitude === 0 && input.longitude === 0),
    ],
    ['Property media', Boolean(input.imageUrl.trim()) || jsonListHasItems(input.imageUrlsJson)],
    ['Amenities', jsonListHasItems(input.amenitiesJson)],
    ['Policies', jsonListHasItems(input.policiesJson)],
    ['Active room type', input.activeRooms > 0],
    ['Active rate plan', input.activeRatePlans > 0],
  ] as const;
  const missing = checks.filter(([, complete]) => !complete).map(([label]) => label);
  return {
    completeChecks: checks.length - missing.length,
    missing,
    ready: missing.length === 0,
    totalChecks: checks.length,
  };
}

export function internalInventorySource(
  listingSource: string,
  normalizedSource?: string,
): 'DIRECT' | 'EXTERNAL' {
  if (normalizedSource) return normalizedSource.toLowerCase() === 'direct' ? 'DIRECT' : 'EXTERNAL';
  return listingSource === 'MANAGED' ? 'DIRECT' : 'EXTERNAL';
}

export function adminSupplyCatalogPath(filters: AdminSupplyCatalogFilters, page: number) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) query.set('q', filters.query);
  if (filters.source !== 'ALL') query.set('source', filters.source);
  if (filters.approval !== 'ALL') query.set('approval', filters.approval);
  if (filters.publication !== 'ALL') query.set('publication', filters.publication);
  if (filters.content !== 'ALL') query.set('content', filters.content);
  return `/admin/catalog?${query.toString()}`;
}
