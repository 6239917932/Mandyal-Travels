import type {
  CustomerTransportBookingStatus,
  CustomerTransportDetailFact,
  CustomerTransportProduct,
} from '../types/customerTransportTripDetail.ts';

const REFERENCE_PATTERN = /^M([BCF])[A-Z0-9]{8,20}$/;
export const CUSTOMER_TRANSPORT_DETAILS_LIMIT = 32_000;
const PRODUCT_BY_PREFIX = {
  B: 'BUS',
  C: 'CAR',
  F: 'FLIGHT',
} as const satisfies Readonly<Record<string, CustomerTransportProduct>>;

const DETAIL_FIELDS = {
  BUS: [
    ['operatorName', 'Operator'],
    ['origin', 'Origin'],
    ['destination', 'Destination'],
    ['travelDate', 'Travel date'],
    ['seats', 'Seats'],
  ],
  CAR: [
    ['vehicleName', 'Vehicle'],
    ['pickupLocation', 'Pickup location'],
    ['dropoffLocation', 'Drop-off location'],
    ['pickupDate', 'Pickup date'],
    ['pickupTime', 'Pickup time'],
    ['dropoffDate', 'Drop-off date'],
    ['dropoffTime', 'Drop-off time'],
  ],
  FLIGHT: [
    ['airlineName', 'Airline'],
    ['flightNumber', 'Flight'],
    ['departureAirport', 'Departure airport'],
    ['destinationAirport', 'Arrival airport'],
    ['departureDate', 'Departure date'],
    ['endDate', 'Return date'],
  ],
} as const satisfies Readonly<
  Record<CustomerTransportProduct, readonly (readonly [string, string])[]>
>;

export type NormalizedTransportReference = Readonly<{
  confirmationCode: string;
  product: CustomerTransportProduct;
}>;

export function normalizeCustomerTransportReference(
  value: string,
): NormalizedTransportReference | undefined {
  const confirmationCode = value.trim().toUpperCase();
  const match = REFERENCE_PATTERN.exec(confirmationCode);
  const product = match?.[1] ? PRODUCT_BY_PREFIX[match[1] as keyof typeof PRODUCT_BY_PREFIX] : null;
  return product ? { confirmationCode, product } : undefined;
}

export function customerTransportBookingStatus(value: string): CustomerTransportBookingStatus {
  switch (value.trim().toUpperCase()) {
    case 'CONFIRMED':
    case 'BOOKED':
      return 'CONFIRMED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    case 'PENDING':
    case 'PROCESSING':
      return 'PROCESSING';
    default:
      return 'UNDER_REVIEW';
  }
}

function safeFactValue(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, 160);
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return normalized || null;
}

export function customerTransportText(value: string, fallback: string, limit: number): string {
  return safeFactValue(value)?.slice(0, limit) || fallback;
}

export function customerTransportDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

export function customerTransportMoney(
  amount: number,
  currency: string,
): Readonly<{ amount: number; currency: 'INR' }> | null {
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000 && currency === 'INR'
    ? { amount, currency: 'INR' }
    : null;
}

export function readCustomerTransportFacts(
  product: CustomerTransportProduct,
  serializedDetails: string,
): CustomerTransportDetailFact[] {
  if (serializedDetails.length > CUSTOMER_TRANSPORT_DETAILS_LIMIT) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedDetails) as unknown;
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const record = parsed as Record<string, unknown>;
  return DETAIL_FIELDS[product].flatMap(([field, label]) => {
    const value = safeFactValue(record[field]);
    return value ? [{ label, value }] : [];
  });
}
