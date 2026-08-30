export const SERVICE_ADVISORY_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export const SERVICE_ADVISORY_SURFACES = [
  'ALL',
  'FLIGHTS',
  'HOTELS',
  'BUSES',
  'CARS',
  'ACCOUNT',
  'BOOKINGS',
  'PAYMENTS',
  'PARTNERS',
] as const;
export const SERVICE_ADVISORY_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'RESOLVED',
  'CANCELLED',
] as const;

export type ServiceAdvisorySeverity = (typeof SERVICE_ADVISORY_SEVERITIES)[number];
export type ServiceAdvisorySurface = (typeof SERVICE_ADVISORY_SURFACES)[number];
export type ServiceAdvisoryStatus = (typeof SERVICE_ADVISORY_STATUSES)[number];

export type ServiceAdvisoryCreateInput = {
  endsAt: Date | null;
  message: string;
  severity: ServiceAdvisorySeverity;
  startsAt: Date | null;
  status: Extract<ServiceAdvisoryStatus, 'ACTIVE' | 'DRAFT' | 'SCHEDULED'>;
  surface: ServiceAdvisorySurface;
  title: string;
};

export type ServiceAdvisoryTransitionInput = {
  expectedVersion: number;
  reason: string;
  targetStatus: ServiceAdvisoryStatus;
};

export function isServiceAdvisorySeverity(value: unknown): value is ServiceAdvisorySeverity {
  return (
    typeof value === 'string' &&
    SERVICE_ADVISORY_SEVERITIES.includes(value as ServiceAdvisorySeverity)
  );
}

export function isServiceAdvisorySurface(value: unknown): value is ServiceAdvisorySurface {
  return (
    typeof value === 'string' && SERVICE_ADVISORY_SURFACES.includes(value as ServiceAdvisorySurface)
  );
}

export function isServiceAdvisoryStatus(value: unknown): value is ServiceAdvisoryStatus {
  return (
    typeof value === 'string' && SERVICE_ADVISORY_STATUSES.includes(value as ServiceAdvisoryStatus)
  );
}

export function isServiceAdvisoryVisible(
  advisory: {
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date,
): boolean {
  if (advisory.status !== 'ACTIVE' && advisory.status !== 'SCHEDULED') return false;
  if (advisory.startsAt && advisory.startsAt > now) return false;
  return !advisory.endsAt || advisory.endsAt > now;
}

const SURFACE_PREFIXES: Record<Exclude<ServiceAdvisorySurface, 'ALL'>, readonly string[]> = {
  FLIGHTS: ['/flights'],
  HOTELS: ['/hotels'],
  BUSES: ['/buses'],
  CARS: ['/cars'],
  ACCOUNT: ['/account', '/login', '/profile', '/register'],
  BOOKINGS: ['/manage-booking', '/booking'],
  PAYMENTS: ['/checkout', '/payment'],
  PARTNERS: ['/partner', '/partners'],
};

export function doesServiceAdvisoryMatchPath(
  surface: ServiceAdvisorySurface,
  pathname: string,
): boolean {
  if (surface === 'ALL') return true;
  return SURFACE_PREFIXES[surface].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const TRANSITIONS: Record<ServiceAdvisoryStatus, readonly ServiceAdvisoryStatus[]> = {
  DRAFT: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'RESOLVED', 'CANCELLED'],
  ACTIVE: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

export function canTransitionServiceAdvisory(
  current: ServiceAdvisoryStatus,
  target: ServiceAdvisoryStatus,
): boolean {
  return TRANSITIONS[current].includes(target);
}

export function serviceAdvisoryAllowedTransitions(
  current: ServiceAdvisoryStatus,
): ServiceAdvisoryStatus[] {
  return [...TRANSITIONS[current]];
}

export function serviceAdvisorySeverityPriority(severity: ServiceAdvisorySeverity): number {
  return { INFO: 1, WARNING: 2, CRITICAL: 3 }[severity];
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 40) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function normalizeServiceAdvisoryCreate(
  value: Record<string, unknown>,
  now = new Date(),
): ServiceAdvisoryCreateInput | null {
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  const severity = value.severity;
  const surface = value.surface;
  const status = value.status;
  const parsedStartsAt = parseOptionalDate(value.startsAt);
  const endsAt = parseOptionalDate(value.endsAt);

  if (
    title.length < 5 ||
    title.length > 120 ||
    message.length < 10 ||
    message.length > 500 ||
    !isServiceAdvisorySeverity(severity) ||
    !isServiceAdvisorySurface(surface) ||
    (status !== 'DRAFT' && status !== 'SCHEDULED' && status !== 'ACTIVE') ||
    parsedStartsAt === undefined ||
    endsAt === undefined
  ) {
    return null;
  }

  const startsAt = status === 'ACTIVE' && !parsedStartsAt ? now : parsedStartsAt;
  if (status === 'SCHEDULED' && (!startsAt || startsAt <= now)) return null;
  if (status === 'ACTIVE' && startsAt && startsAt > now) return null;
  if (endsAt && endsAt <= (startsAt ?? now)) return null;

  return { endsAt, message, severity, startsAt, status, surface, title };
}

export function normalizeServiceAdvisoryTransition(
  value: Record<string, unknown>,
): ServiceAdvisoryTransitionInput | null {
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (
    !Number.isInteger(value.expectedVersion) ||
    Number(value.expectedVersion) < 1 ||
    !isServiceAdvisoryStatus(value.targetStatus) ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return null;
  }
  return {
    expectedVersion: Number(value.expectedVersion),
    reason,
    targetStatus: value.targetStatus,
  };
}
