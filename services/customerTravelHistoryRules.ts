import type {
  CustomerTravelHistoryDocument,
  CustomerTravelHistoryProduct,
  CustomerTravelHistoryStatus,
} from '../types/customerTravelHistory.ts';

export const CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE = 20;
export const CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT = 500;
export const CUSTOMER_TRAVEL_HISTORY_DETAILS_LIMIT = 32_000;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const HAS_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const TRANSPORT_REFERENCE_PATTERN = /^M([BCF])[A-Z0-9]{8,20}$/;
const HOTEL_REFERENCE_PATTERN = /^MT[A-F0-9]{12}$/;
const PRODUCT_BY_PREFIX = {
  B: 'BUS',
  C: 'CAR',
  F: 'FLIGHT',
} as const;

const DOCUMENTS = {
  BUS: {
    label: 'View ticket',
    path: 'buses',
    required: ['destination', 'offerId', 'origin', 'passengers', 'seats', 'travelDate'],
    keys: ['destination', 'offerId', 'origin', 'passengers', 'seats', 'travelDate'],
  },
  CAR: {
    label: 'View voucher',
    path: 'cars',
    required: [
      'drivers',
      'dropoffDate',
      'dropoffLocation',
      'dropoffTime',
      'offerId',
      'pickupDate',
      'pickupLocation',
      'pickupTime',
      'rentalMode',
    ],
    keys: [
      'drivers',
      'dropoffDate',
      'dropoffLocation',
      'dropoffTime',
      'offerId',
      'pickupDate',
      'pickupLocation',
      'pickupTime',
      'rentalMode',
    ],
  },
  FLIGHT: {
    label: 'View itinerary',
    path: 'flights',
    required: [
      'adults',
      'cabinClass',
      'departureDate',
      'destination',
      'offerId',
      'origin',
      'tripType',
    ],
    keys: [
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
    ],
  },
} as const;

export function customerTravelHistoryPage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || !/^[1-9]\d{0,5}$/.test(first)) return 1;
  const parsed = Number(first);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

export function customerTravelHistoryPagination(
  requestedPage: number,
  availableCount: number,
): Readonly<{ page: number; pages: number; skip: number }> {
  const boundedCount = Math.max(
    0,
    Math.min(
      Number.isSafeInteger(availableCount) ? availableCount : 0,
      CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
    ),
  );
  const pages = Math.max(1, Math.ceil(boundedCount / CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(Number.isSafeInteger(requestedPage) ? requestedPage : 1, pages),
  );
  return { page, pages, skip: (page - 1) * CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE };
}

export function customerTravelHistoryStatus(value: string): CustomerTravelHistoryStatus {
  switch (value.trim().toUpperCase()) {
    case 'BOOKED':
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'CANCELED':
    case 'CANCELLED':
      return 'CANCELLED';
    case 'PENDING':
    case 'PROCESSING':
      return 'PROCESSING';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerTravelHistoryDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

export function customerTravelHistoryMoney(
  amount: number,
  currency: string,
): Readonly<{ amount: number; currency: 'INR' }> | null {
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000 && currency === 'INR'
    ? { amount, currency: 'INR' }
    : null;
}

export function customerTravelHistoryText(value: string, fallback: string, limit: number): string {
  const normalized = value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
  return normalized || fallback;
}

export function customerTravelHistoryTransportReference(
  value: string,
  product: string,
): Readonly<{
  bookingReference: string;
  product: Exclude<CustomerTravelHistoryProduct, 'HOTEL'>;
}> | null {
  const bookingReference = value.trim().toUpperCase();
  const match = TRANSPORT_REFERENCE_PATTERN.exec(bookingReference);
  const productFromPrefix = match?.[1]
    ? PRODUCT_BY_PREFIX[match[1] as keyof typeof PRODUCT_BY_PREFIX]
    : undefined;
  const normalizedProduct = product.trim().toUpperCase();
  return productFromPrefix && productFromPrefix === normalizedProduct
    ? { bookingReference, product: productFromPrefix }
    : null;
}

export function customerTravelHistoryHotelReference(value: string): string | null {
  const bookingReference = value.trim().toUpperCase();
  return HOTEL_REFERENCE_PATTERN.test(bookingReference) ? bookingReference : null;
}

export function customerTravelHistoryHotelName(value: string): string {
  const name = value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
  return customerTravelHistoryText(name, 'Hotel stay', 160);
}

function safeDocumentQuery(serializedDetails: string): string | null {
  if (serializedDetails.length > CUSTOMER_TRAVEL_HISTORY_DETAILS_LIMIT) return null;
  try {
    const parsed = JSON.parse(serializedDetails) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const documentQuery = (parsed as Record<string, unknown>).documentQuery;
    return typeof documentQuery === 'string' && documentQuery.length <= 8_000
      ? documentQuery
      : null;
  } catch {
    return null;
  }
}

function allowedDocumentQuery(
  product: keyof typeof DOCUMENTS,
  serializedDetails: string,
): URLSearchParams | null {
  const raw = safeDocumentQuery(serializedDetails);
  if (!raw) return null;
  const source = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const policy = DOCUMENTS[product];
  const allowedKeys = new Set<string>(policy.keys);
  const rebuilt = new URLSearchParams();

  for (const [key, value] of source.entries()) {
    if (!allowedKeys.has(key)) continue;
    if (rebuilt.has(key)) return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > 240 || HAS_CONTROL_CHARACTERS.test(normalized)) continue;
    rebuilt.set(key, normalized);
  }
  if (!policy.required.every((key) => rebuilt.has(key))) return null;

  const date = (key: string) => customerTravelHistoryDate(rebuilt.get(key) ?? '') !== null;
  const count = (key: string, maximum: number) => {
    const value = rebuilt.get(key) ?? '';
    return /^[1-9]\d*$/.test(value) && Number(value) <= maximum;
  };
  if (product === 'FLIGHT') {
    const tripType = rebuilt.get('tripType');
    const cabin = rebuilt.get('cabinClass');
    if (
      !['one-way', 'return', 'multi-city'].includes(tripType ?? '') ||
      !['economy', 'premium-economy', 'business'].includes(cabin ?? '') ||
      !/^[A-Z]{3}$/.test(rebuilt.get('origin') ?? '') ||
      !/^[A-Z]{3}$/.test(rebuilt.get('destination') ?? '') ||
      !count('adults', 9) ||
      !date('departureDate')
    ) {
      return null;
    }
    if (tripType === 'return' && !date('returnDate')) return null;
    if (
      tripType === 'multi-city' &&
      (!/^[A-Z]{3}$/.test(rebuilt.get('segment2Origin') ?? '') ||
        !/^[A-Z]{3}$/.test(rebuilt.get('segment2Destination') ?? '') ||
        !date('segment2Date'))
    ) {
      return null;
    }
  }
  if (product === 'BUS') {
    const seats = (rebuilt.get('seats') ?? '').split(',');
    if (
      !count('passengers', 6) ||
      !date('travelDate') ||
      seats.length !== Number(rebuilt.get('passengers')) ||
      seats.some((seat) => !/^[A-Za-z0-9-]{1,12}$/.test(seat))
    ) {
      return null;
    }
  }
  if (
    product === 'CAR' &&
    (!count('drivers', 4) ||
      !date('pickupDate') ||
      !date('dropoffDate') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rebuilt.get('pickupTime') ?? '') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rebuilt.get('dropoffTime') ?? '') ||
      !['self-drive', 'chauffeur'].includes(rebuilt.get('rentalMode') ?? ''))
  ) {
    return null;
  }

  return rebuilt;
}

export function customerTravelHistoryTransportDocument(
  product: Exclude<CustomerTravelHistoryProduct, 'HOTEL'>,
  bookingReference: string,
  serializedDetails: string,
): CustomerTravelHistoryDocument | null {
  const reference = customerTravelHistoryTransportReference(bookingReference, product);
  if (!reference) return null;
  const query = allowedDocumentQuery(product, serializedDetails);
  if (!query) return null;
  const policy = DOCUMENTS[product];
  return {
    href: `/${policy.path}/booking/${encodeURIComponent(reference.bookingReference)}/${
      product === 'FLIGHT' ? 'itinerary' : product === 'BUS' ? 'ticket' : 'voucher'
    }?${query.toString()}`,
    label: policy.label,
  };
}
