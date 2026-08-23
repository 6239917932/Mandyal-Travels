type SearchValue = string | string[] | undefined;

export const ADMIN_AUDIT_DOMAINS = [
  'ALL',
  'PLATFORM',
  'CONTENT',
  'PARTNER',
  'ORGANIZATION',
  'SUPPORT',
  'SECURITY',
  'PRIVACY',
] as const;

export type AdminAuditDomain = (typeof ADMIN_AUDIT_DOMAINS)[number];

export type AdminAuditFilters = {
  domain: AdminAuditDomain;
  from: string;
  page: number;
  query: string;
  to: string;
};

export const ADMIN_AUDIT_PAGE_SIZE = 25;
export const ADMIN_AUDIT_MAX_PAGE = 40;

const DOMAIN_SET = new Set<string>(ADMIN_AUDIT_DOMAINS);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: SearchValue) {
  const candidate = first(value)?.trim() ?? '';
  if (!DATE_PATTERN.test(candidate)) return '';
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? ''
    : candidate;
}

export function normalizeAdminAuditFilters(values: {
  domain?: SearchValue;
  from?: SearchValue;
  page?: SearchValue;
  q?: SearchValue;
  to?: SearchValue;
}): AdminAuditFilters {
  const candidateDomain = (first(values.domain) ?? 'ALL').trim().toUpperCase();
  const parsedPage = Number(first(values.page));
  const from = validDate(values.from);
  const to = validDate(values.to);
  const validRange = !from || !to || from <= to;

  return {
    domain: DOMAIN_SET.has(candidateDomain) ? (candidateDomain as AdminAuditDomain) : 'ALL',
    from: validRange ? from : '',
    page:
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? Math.min(parsedPage, ADMIN_AUDIT_MAX_PAGE)
        : 1,
    query: (first(values.q) ?? '').trim().slice(0, 100),
    to: validRange ? to : '',
  };
}

export function adminAuditCreatedAtRange(from: string, to: string) {
  const lower = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const upper = to ? new Date(`${to}T00:00:00.000Z`) : undefined;
  if (upper) upper.setUTCDate(upper.getUTCDate() + 1);
  return lower || upper
    ? { ...(lower ? { gte: lower } : {}), ...(upper ? { lt: upper } : {}) }
    : undefined;
}

export function adminAuditPath(filters: AdminAuditFilters, page: number) {
  const query = new URLSearchParams({
    page: String(Math.min(Math.max(1, page), ADMIN_AUDIT_MAX_PAGE)),
  });
  if (filters.domain !== 'ALL') query.set('domain', filters.domain);
  if (filters.query) query.set('q', filters.query);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return `/admin/audit?${query.toString()}`;
}

export function auditSourceTake(page: number) {
  return Math.min(
    Math.max(1, page) * ADMIN_AUDIT_PAGE_SIZE,
    ADMIN_AUDIT_PAGE_SIZE * ADMIN_AUDIT_MAX_PAGE,
  );
}
