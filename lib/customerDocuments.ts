export const CUSTOMER_DOCUMENT_PAGE_SIZE = 20;
export const CUSTOMER_DOCUMENT_RESULT_CAP = 500;
export const CUSTOMER_DOCUMENT_MAX_PAGE = Math.ceil(
  CUSTOMER_DOCUMENT_RESULT_CAP / CUSTOMER_DOCUMENT_PAGE_SIZE,
);

export type CustomerDocumentProduct = 'BUS' | 'CAR' | 'FLIGHT';

export type CustomerDocumentLink = Readonly<{
  href: string;
  label: string;
}>;

type DocumentRoute = Readonly<{
  allowedQueryKeys: ReadonlySet<string>;
  label: string;
  pathname: (confirmationCode: string) => string;
}>;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const CONFIRMATION_CODE_PATTERN = /^M[BCF][A-Z0-9]{8,20}$/;
const OFFER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const MAX_DOCUMENT_QUERY_LENGTH = 2_048;
const MAX_QUERY_VALUE_LENGTH = 200;

const DOCUMENT_ROUTES: Record<CustomerDocumentProduct, DocumentRoute> = {
  BUS: {
    allowedQueryKeys: new Set([
      'destination',
      'offerId',
      'origin',
      'passengers',
      'seats',
      'travelDate',
    ]),
    label: 'Open prototype bus ticket',
    pathname: (confirmationCode) => `/buses/booking/${confirmationCode}/ticket`,
  },
  CAR: {
    allowedQueryKeys: new Set([
      'drivers',
      'dropoffDate',
      'dropoffLocation',
      'dropoffTime',
      'offerId',
      'pickupDate',
      'pickupLocation',
      'pickupTime',
      'rentalMode',
    ]),
    label: 'Open prototype car rental voucher',
    pathname: (confirmationCode) => `/cars/booking/${confirmationCode}/voucher`,
  },
  FLIGHT: {
    allowedQueryKeys: new Set([
      'adults',
      'cabinClass',
      'departureDate',
      'destination',
      'offerId',
      'origin',
      'returnDate',
      'segment2Date',
      'segment2Destination',
      'segment2Origin',
      'segment3Date',
      'segment3Destination',
      'segment3Origin',
      'tripType',
    ]),
    label: 'Open prototype flight itinerary',
    pathname: (confirmationCode) => `/flights/booking/${confirmationCode}/itinerary`,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCustomerDocumentProduct(value: string): value is CustomerDocumentProduct {
  return value === 'BUS' || value === 'CAR' || value === 'FLIGHT';
}

export function boundedCustomerDocumentPage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, CUSTOMER_DOCUMENT_MAX_PAGE)
    : 1;
}

export function cappedCustomerDocumentCount(count: number): number {
  return Math.min(Math.max(0, count), CUSTOMER_DOCUMENT_RESULT_CAP);
}

export function customerDocumentPageCount(count: number): number {
  return Math.max(1, Math.ceil(cappedCustomerDocumentCount(count) / CUSTOMER_DOCUMENT_PAGE_SIZE));
}

export function customerDocumentCenterPath(pages: { hotelPage: number; tripPage: number }): string {
  const query = new URLSearchParams({
    hotelPage: String(Math.min(Math.max(1, pages.hotelPage), CUSTOMER_DOCUMENT_MAX_PAGE)),
    tripPage: String(Math.min(Math.max(1, pages.tripPage), CUSTOMER_DOCUMENT_MAX_PAGE)),
  });
  return `/account/documents?${query.toString()}`;
}

export function safeTransportDocumentLink(input: {
  confirmationCode: string;
  detailsJson: string;
  productType: string;
  status: string;
}): CustomerDocumentLink | null {
  if (
    input.status.toUpperCase() !== 'CONFIRMED' ||
    !CONFIRMATION_CODE_PATTERN.test(input.confirmationCode) ||
    !isCustomerDocumentProduct(input.productType)
  ) {
    return null;
  }

  let details: unknown;
  try {
    details = JSON.parse(input.detailsJson) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(details) || typeof details.documentQuery !== 'string') return null;
  if (
    details.documentQuery.length < 1 ||
    details.documentQuery.length > MAX_DOCUMENT_QUERY_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(details.documentQuery)
  ) {
    return null;
  }

  const route = DOCUMENT_ROUTES[input.productType];
  const source = new URLSearchParams(details.documentQuery);
  const safeQuery = new URLSearchParams();
  const seen = new Set<string>();
  for (const [key, value] of source.entries()) {
    if (
      !route.allowedQueryKeys.has(key) ||
      seen.has(key) ||
      value.length < 1 ||
      value.length > MAX_QUERY_VALUE_LENGTH ||
      CONTROL_CHARACTER_PATTERN.test(value)
    ) {
      continue;
    }
    safeQuery.set(key, value);
    seen.add(key);
  }

  const offerId = safeQuery.get('offerId');
  if (!offerId || !OFFER_ID_PATTERN.test(offerId)) return null;
  return {
    href: `${route.pathname(input.confirmationCode)}?${safeQuery.toString()}`,
    label: route.label,
  };
}
