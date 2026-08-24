export const MANAGE_BOOKING_REFERENCE_MAX_LENGTH = 22;

export type ManageBookingProduct = 'BUS' | 'CAR' | 'FLIGHT';

export type ManageBookingReference =
  | Readonly<{ confirmationCode: string; kind: 'HOTEL' }>
  | Readonly<{
      confirmationCode: string;
      kind: 'TRANSPORT';
      productType: ManageBookingProduct;
    }>;

export type ManagedTransportTrip = Readonly<{
  confirmationCode: string;
  currency: 'INR';
  endDate: string | null;
  productType: ManageBookingProduct;
  startDate: string;
  status: 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'UNDER_REVIEW';
  subtitle: string;
  title: string;
  totalAmount: number;
}>;

const PRODUCT_BY_PREFIX = {
  MB: 'BUS',
  MC: 'CAR',
  MF: 'FLIGHT',
} as const satisfies Readonly<Record<string, ManageBookingProduct>>;

const REFERENCE_PATTERN = /^M([TBCF])[A-Z0-9]{8,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TRANSPORT_STATUSES = new Set<ManagedTransportTrip['status']>([
  'CANCELLED',
  'CONFIRMED',
  'PROCESSING',
  'UNDER_REVIEW',
]);
const MAX_TRANSPORT_TOTAL = 100_000_000;

export function normalizeManageBookingReference(value: string): ManageBookingReference | undefined {
  const confirmationCode = value.trim().toUpperCase();
  if (confirmationCode.length > MANAGE_BOOKING_REFERENCE_MAX_LENGTH) return undefined;
  const productMarker = REFERENCE_PATTERN.exec(confirmationCode)?.[1];
  if (!productMarker) return undefined;
  if (productMarker === 'T') return { confirmationCode, kind: 'HOTEL' };
  const productType = PRODUCT_BY_PREFIX[`M${productMarker}` as keyof typeof PRODUCT_BY_PREFIX];
  return productType ? { confirmationCode, kind: 'TRANSPORT', productType } : undefined;
}

export function manageBookingLookupError(status: number): string {
  if (status >= 500) {
    return 'Booking management is temporarily unavailable. Please try again.';
  }
  if (status === 401 || status === 403) {
    return 'Sign in to the booking account or use the browser where the booking was completed.';
  }
  return 'We could not find that booking. Check the reference and try again.';
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function boundedText(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength;
}

export function readManagedTransportTrip(
  value: unknown,
  expected: Extract<ManageBookingReference, { kind: 'TRANSPORT' }>,
): ManagedTransportTrip | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const endDate = record.endDate;
  if (
    record.confirmationCode !== expected.confirmationCode ||
    record.productType !== expected.productType ||
    record.currency !== 'INR' ||
    !validDate(record.startDate) ||
    (endDate !== null && !validDate(endDate)) ||
    (typeof endDate === 'string' && endDate < record.startDate) ||
    typeof record.status !== 'string' ||
    !TRANSPORT_STATUSES.has(record.status as ManagedTransportTrip['status']) ||
    !boundedText(record.title, 160) ||
    !boundedText(record.subtitle, 200) ||
    !Number.isSafeInteger(record.totalAmount) ||
    (record.totalAmount as number) < 0 ||
    (record.totalAmount as number) > MAX_TRANSPORT_TOTAL
  ) {
    return undefined;
  }

  return {
    confirmationCode: expected.confirmationCode,
    currency: 'INR',
    endDate: endDate as string | null,
    productType: expected.productType,
    startDate: record.startDate,
    status: record.status as ManagedTransportTrip['status'],
    subtitle: record.subtitle.trim(),
    title: record.title.trim(),
    totalAmount: record.totalAmount as number,
  };
}
