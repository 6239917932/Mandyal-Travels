type SearchValue = string | string[] | undefined;

const PRODUCTS = new Set(['ALL', 'HOTEL', 'FLIGHT', 'BUS', 'CAR']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DocumentReadiness = 'READY' | 'REVIEW' | 'BLOCKED' | 'UNAVAILABLE';

export type AdminDocumentFilters = {
  from: string;
  hotelPage: number;
  product: string;
  query: string;
  to: string;
  tripPage: number;
};

export type HotelDocumentEvidence = {
  amendmentStatuses: string[];
  bookingCurrency: string;
  bookingStatus: string;
  bookingTotal: number;
  paymentAmount: number | null;
  paymentCurrency: string | null;
  paymentStatus: string | null;
  refundStatuses: string[];
};

export type DocumentPosture = {
  billing: DocumentReadiness;
  confirmation: DocumentReadiness;
  reason: string;
};

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function page(value: SearchValue): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function date(value: SearchValue): string {
  const candidate = first(value)?.trim() ?? '';
  if (!DATE_PATTERN.test(candidate)) return '';
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? ''
    : candidate;
}

export function normalizeAdminDocumentFilters(values: {
  from?: SearchValue;
  hotelPage?: SearchValue;
  product?: SearchValue;
  q?: SearchValue;
  to?: SearchValue;
  tripPage?: SearchValue;
}): AdminDocumentFilters {
  const product = (first(values.product) ?? 'ALL').trim().toUpperCase();
  const from = date(values.from);
  const to = date(values.to);
  const validRange = !from || !to || from <= to;

  return {
    from: validRange ? from : '',
    hotelPage: page(values.hotelPage),
    product: PRODUCTS.has(product) ? product : 'ALL',
    query: (first(values.q) ?? '').trim().slice(0, 100),
    to: validRange ? to : '',
    tripPage: page(values.tripPage),
  };
}

export function documentCreatedAtRange(from: string, to: string) {
  const lower = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const upper = to ? new Date(`${to}T00:00:00.000Z`) : undefined;
  if (upper) upper.setUTCDate(upper.getUTCDate() + 1);
  return lower || upper
    ? { ...(lower ? { gte: lower } : {}), ...(upper ? { lt: upper } : {}) }
    : undefined;
}

export function adminDocumentPath(
  filters: AdminDocumentFilters,
  pages: { hotelPage: number; tripPage: number },
): string {
  const query = new URLSearchParams({
    hotelPage: String(Math.max(1, pages.hotelPage)),
    tripPage: String(Math.max(1, pages.tripPage)),
  });
  if (filters.query) query.set('q', filters.query);
  if (filters.product !== 'ALL') query.set('product', filters.product);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return `/admin/documents?${query.toString()}`;
}

export function hotelDocumentPosture(evidence: HotelDocumentEvidence): DocumentPosture {
  if (evidence.bookingStatus.toLowerCase() !== 'confirmed') {
    return {
      billing: 'BLOCKED',
      confirmation: 'BLOCKED',
      reason: 'Booking is not confirmed; customer documents must not be treated as final.',
    };
  }
  if (
    evidence.amendmentStatuses.some((status) => status.toUpperCase() === 'PENDING') ||
    evidence.refundStatuses.some((status) =>
      ['PENDING', 'PROVIDER_FAILED'].includes(status.toUpperCase()),
    )
  ) {
    return {
      billing: 'REVIEW',
      confirmation: 'REVIEW',
      reason: 'An amendment or refund is unresolved; reproduce documents only after review.',
    };
  }
  if (evidence.paymentStatus?.toLowerCase() !== 'captured') {
    return {
      billing: 'BLOCKED',
      confirmation: 'REVIEW',
      reason: 'Captured payment evidence is missing.',
    };
  }
  if (
    evidence.paymentAmount !== evidence.bookingTotal ||
    evidence.paymentCurrency !== evidence.bookingCurrency
  ) {
    return {
      billing: 'REVIEW',
      confirmation: 'REVIEW',
      reason: 'Booking and captured payment values do not match.',
    };
  }
  return {
    billing: 'READY',
    confirmation: 'READY',
    reason: 'Confirmed booking and matching captured payment evidence are present.',
  };
}

export function tripDocumentPosture(status: string): DocumentPosture {
  if (status.toUpperCase() !== 'CONFIRMED') {
    return {
      billing: 'UNAVAILABLE',
      confirmation: 'BLOCKED',
      reason: 'The journey is not confirmed; no final confirmation document is available.',
    };
  }
  return {
    billing: 'UNAVAILABLE',
    confirmation: 'READY',
    reason:
      'The operational confirmation is ready; provider-backed billing evidence is not stored.',
  };
}

export function privateDocumentSubject(reference: string): string {
  const normalized = reference.trim().toUpperCase();
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 3)}•••${normalized.slice(-3)}`;
}
