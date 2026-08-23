type SearchValue = string | string[] | undefined;

const PRODUCTS = new Set(['ALL', 'HOTEL', 'FLIGHT', 'BUS', 'CAR']);
const STATUSES = new Set(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AdminBookingDirectoryFilters = {
  from: string;
  hotelPage: number;
  product: string;
  query: string;
  status: string;
  to: string;
  tripPage: number;
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function page(value: SearchValue) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function date(value: SearchValue) {
  const candidate = first(value)?.trim() ?? '';
  if (!DATE_PATTERN.test(candidate)) return '';
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? ''
    : candidate;
}

export function normalizeAdminBookingDirectoryFilters(values: {
  from?: SearchValue;
  hotelPage?: SearchValue;
  product?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
  to?: SearchValue;
  tripPage?: SearchValue;
}): AdminBookingDirectoryFilters {
  const product = (first(values.product) ?? 'ALL').trim().toUpperCase();
  const status = (first(values.status) ?? 'ALL').trim().toUpperCase();
  const from = date(values.from);
  const to = date(values.to);
  const validRange = !from || !to || from <= to;

  return {
    from: validRange ? from : '',
    hotelPage: page(values.hotelPage),
    product: PRODUCTS.has(product) ? product : 'ALL',
    query: (first(values.q) ?? '').trim().slice(0, 100),
    status: STATUSES.has(status) ? status : 'ALL',
    to: validRange ? to : '',
    tripPage: page(values.tripPage),
  };
}

export function adminBookingDirectoryPath(
  filters: AdminBookingDirectoryFilters,
  pages: { hotelPage: number; tripPage: number },
) {
  const query = new URLSearchParams({
    hotelPage: String(Math.max(1, pages.hotelPage)),
    tripPage: String(Math.max(1, pages.tripPage)),
  });
  if (filters.query) query.set('q', filters.query);
  if (filters.product !== 'ALL') query.set('product', filters.product);
  if (filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return `/admin/bookings?${query.toString()}`;
}

export function bookingCreatedAtRange(from: string, to: string) {
  const lower = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const upper = to ? new Date(`${to}T00:00:00.000Z`) : undefined;
  if (upper) upper.setUTCDate(upper.getUTCDate() + 1);
  return lower || upper
    ? { ...(lower ? { gte: lower } : {}), ...(upper ? { lt: upper } : {}) }
    : undefined;
}
