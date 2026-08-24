import type {
  CustomerServicingIntent,
  CustomerSupportCategory,
  CustomerSupportPublicStatus,
} from '@/types/customerSupportCenter';

export const CUSTOMER_SUPPORT_BODY_LIMIT_BYTES = 8 * 1024;
export const CUSTOMER_SUPPORT_PAGE_SIZE = 20;
export const CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT = 500;
export const CUSTOMER_SUPPORT_MAX_PAGE = Math.ceil(
  CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT / CUSTOMER_SUPPORT_PAGE_SIZE,
);
export const CUSTOMER_SUPPORT_QUERY_LIMIT = 80;

const CATEGORIES = new Set<CustomerSupportCategory>([
  'ACCOUNT',
  'BOOKING',
  'OTHER',
  'PAYMENT',
  'TECHNICAL',
]);
const INTENTS = new Set<CustomerServicingIntent>([
  'CANCELLATION_REQUEST',
  'CHANGE_REQUEST',
  'GENERAL_HELP',
]);
const STATUSES = new Set<CustomerSupportPublicStatus>(['CLOSED', 'OPEN']);
const TRANSPORT_PRODUCTS = new Set(['BUS', 'CAR', 'FLIGHT']);
const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/;

type SearchValue = string | string[] | undefined;

function firstValue(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readCustomerSupportCategory(value: unknown): CustomerSupportCategory | null {
  const category = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return CATEGORIES.has(category as CustomerSupportCategory)
    ? (category as CustomerSupportCategory)
    : null;
}

export function readCustomerServicingIntent(value: unknown): CustomerServicingIntent | null {
  const intent = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return INTENTS.has(intent as CustomerServicingIntent)
    ? (intent as CustomerServicingIntent)
    : null;
}

export function normalizeCustomerBookingReference(value: unknown): string | null {
  const reference = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return !reference || BOOKING_REFERENCE_PATTERN.test(reference) ? reference : null;
}

export function normalizeCustomerSupportFilters(values: {
  page?: SearchValue;
  q?: SearchValue;
  status?: SearchValue;
}) {
  const rawPage = Number(firstValue(values.page));
  const rawStatus = (firstValue(values.status) ?? 'ALL').trim().toUpperCase();
  const status = STATUSES.has(rawStatus as CustomerSupportPublicStatus)
    ? (rawStatus as CustomerSupportPublicStatus)
    : 'ALL';

  return {
    page:
      Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, CUSTOMER_SUPPORT_MAX_PAGE) : 1,
    query: (firstValue(values.q) ?? '').trim().slice(0, CUSTOMER_SUPPORT_QUERY_LIMIT),
    status,
  } as const;
}

export function customerSupportCategoryLabel(category: string): string {
  switch (category) {
    case 'ACCOUNT':
      return 'Account or access';
    case 'BOOKING':
      return 'Booking';
    case 'PAYMENT':
      return 'Payment';
    case 'TECHNICAL':
      return 'Technical issue';
    case 'OTHER':
      return 'Other';
    default:
      return 'General support';
  }
}

export function customerSupportPublicStatusLabel(status: string): string {
  return status === 'CLOSED' ? 'Closed' : status === 'OPEN' ? 'Open' : 'Under review';
}

export function isTransportServicingIntentAllowed({
  category,
  hasBookingReference,
  intent,
  productType,
}: {
  category: CustomerSupportCategory;
  hasBookingReference: boolean;
  intent: CustomerServicingIntent;
  productType: string | null;
}): boolean {
  if (intent === 'GENERAL_HELP') return true;
  return (
    category === 'BOOKING' &&
    hasBookingReference &&
    productType !== null &&
    TRANSPORT_PRODUCTS.has(productType.trim().toUpperCase())
  );
}

export function customerServicingSubject({
  intent,
  productType,
  subject,
}: {
  intent: CustomerServicingIntent;
  productType: string | null;
  subject: string;
}): string {
  if (intent === 'GENERAL_HELP') return subject;
  const product = productType?.trim().toLowerCase();
  const action = intent === 'CHANGE_REQUEST' ? 'change request' : 'cancellation request';
  const prefix = product ? `${product} ${action}` : action;
  return `${prefix}: ${subject}`.slice(0, 120);
}

export function isDirectSameOriginSupportMutation(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get('sec-fetch-site') === 'same-origin';
}
