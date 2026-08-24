import { createHash } from 'node:crypto';

import { normalizeEmail } from '../lib/auth/validation.ts';

export const CUSTOMER_TRIP_PRODUCTS = ['FLIGHT', 'BUS', 'CAR'] as const;

export type CustomerTripProduct = (typeof CUSTOMER_TRIP_PRODUCTS)[number];
export type CustomerTripPublicStatus = 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'UNDER_REVIEW';

export type CustomerTripOwner = Readonly<{
  email: string;
  userId: string;
}>;

export type CustomerTripOwnershipRecord = Readonly<{
  email: string;
  userId: string | null;
}>;

export type CustomerTripImmutableContext = Readonly<{
  businessTravelRequestId: string | null | undefined;
  confirmationCode: string;
  currency: string;
  detailsJson: string;
  endDate: string | null;
  productType: string;
  startDate: string;
  status: string;
  subtitle: string;
  title: string;
  totalAmount: number;
}>;

export type CustomerTripResponseRecord = Readonly<{
  confirmationCode: string;
  currency: string;
  endDate: string | null;
  productType: string;
  startDate: string;
  status: string;
  subtitle: string;
  title: string;
  totalAmount: number;
}>;

export type CustomerTripResponse = Readonly<{
  confirmationCode: string;
  currency: 'INR';
  endDate: string | null;
  productType: CustomerTripProduct;
  startDate: string;
  status: CustomerTripPublicStatus;
  subtitle: string;
  title: string;
  totalAmount: number;
}>;

const PRODUCT_BY_PREFIX = {
  MB: 'BUS',
  MC: 'CAR',
  MF: 'FLIGHT',
} as const satisfies Readonly<Record<string, CustomerTripProduct>>;

const CUSTOMER_TRIP_REFERENCE_PATTERN = /^(MB|MC|MF)[A-Z0-9]{8,20}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TRIP_AMOUNT = 100_000_000;

export function normalizeCustomerTripReference(
  value: string,
): Readonly<{ confirmationCode: string; productType: CustomerTripProduct }> | undefined {
  const confirmationCode = value.trim().toUpperCase();
  const prefix = CUSTOMER_TRIP_REFERENCE_PATTERN.exec(confirmationCode)?.[1];
  const productType = prefix ? PRODUCT_BY_PREFIX[prefix as keyof typeof PRODUCT_BY_PREFIX] : null;
  return productType ? { confirmationCode, productType } : undefined;
}

export function isCustomerTripProduct(value: string): value is CustomerTripProduct {
  return CUSTOMER_TRIP_PRODUCTS.some((product) => product === value);
}

export function customerOwnsTrip(
  trip: CustomerTripOwnershipRecord,
  owner: CustomerTripOwner,
): boolean {
  if (trip.userId === owner.userId) return true;
  const sessionEmail = normalizeEmail(owner.email);
  return (
    trip.userId === null && sessionEmail.length > 0 && normalizeEmail(trip.email) === sessionEmail
  );
}

export function customerTripImmutableFingerprint(value: CustomerTripImmutableContext): string {
  const serialized = JSON.stringify({
    businessTravelRequestId: value.businessTravelRequestId ?? null,
    confirmationCode: value.confirmationCode,
    currency: value.currency,
    detailsDigest: createHash('sha256').update(value.detailsJson, 'utf8').digest('hex'),
    endDate: value.endDate,
    productType: value.productType,
    startDate: value.startDate,
    status: value.status,
    subtitle: value.subtitle,
    title: value.title,
    totalAmount: value.totalAmount,
  });
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

export function customerTripContextsMatch(
  stored: CustomerTripImmutableContext,
  requested: CustomerTripImmutableContext,
): boolean {
  return customerTripImmutableFingerprint(stored) === customerTripImmutableFingerprint(requested);
}

function normalizedText(value: string, maximumLength: number): string | null {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 && normalized.length <= maximumLength ? normalized : null;
}

function normalizedDate(value: string): string | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function publicStatus(value: string): CustomerTripPublicStatus {
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

export function customerTripResponse(
  trip: CustomerTripResponseRecord,
): CustomerTripResponse | undefined {
  const reference = normalizeCustomerTripReference(trip.confirmationCode);
  const startDate = normalizedDate(trip.startDate);
  const endDate = trip.endDate === null ? null : normalizedDate(trip.endDate);
  const title = normalizedText(trip.title, 160);
  const subtitle = normalizedText(trip.subtitle, 200);
  if (
    !reference ||
    trip.productType !== reference.productType ||
    trip.currency !== 'INR' ||
    !Number.isSafeInteger(trip.totalAmount) ||
    trip.totalAmount < 0 ||
    trip.totalAmount > MAX_TRIP_AMOUNT ||
    !startDate ||
    (trip.endDate !== null && (!endDate || endDate < startDate)) ||
    !title ||
    !subtitle
  ) {
    return undefined;
  }

  return {
    confirmationCode: reference.confirmationCode,
    currency: 'INR',
    endDate,
    productType: reference.productType,
    startDate,
    status: publicStatus(trip.status),
    subtitle,
    title,
    totalAmount: trip.totalAmount,
  };
}
