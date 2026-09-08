import { createHash } from 'node:crypto';

import { HOTEL_VENDOR_CATEGORIES, HOTEL_VENDOR_STATUSES } from './vendorCatalog.ts';

export { HOTEL_VENDOR_CATEGORIES, HOTEL_VENDOR_STATUSES };

const clean = (value: unknown, maximum: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value: string) {
  return !value || /^\+?[0-9][0-9 -]{6,19}$/.test(value);
}

function paymentTerms(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 365 ? parsed : null;
}

function version(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeHotelVendor(input: Record<string, unknown>) {
  const vendorCode = clean(input.vendorCode, 30)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '');
  const legalName = clean(input.legalName, 140);
  const tradingName = clean(input.tradingName, 140);
  const category = clean(input.category, 30).toUpperCase();
  const contactName = clean(input.contactName, 120);
  const email = clean(input.email, 160).toLowerCase();
  const phone = clean(input.phone, 24);
  const paymentTermsDays = paymentTerms(input.paymentTermsDays);
  const commercialNote = clean(input.commercialNote, 300);
  if (
    vendorCode.length < 2 ||
    legalName.length < 2 ||
    contactName.length < 2 ||
    !HOTEL_VENDOR_CATEGORIES.includes(category as (typeof HOTEL_VENDOR_CATEGORIES)[number]) ||
    !validEmail(email) ||
    !validPhone(phone) ||
    (!email && !phone) ||
    paymentTermsDays === null
  ) {
    return null;
  }
  return {
    category,
    commercialNote,
    contactName,
    email,
    legalName,
    paymentTermsDays,
    phone,
    tradingName,
    vendorCode,
  };
}

export function normalizeHotelVendorStatus(input: Record<string, unknown>) {
  const vendorId = clean(input.vendorId, 100);
  const status = clean(input.status, 20).toUpperCase();
  const expectedVersion = version(input.expectedVersion);
  const note = clean(input.note, 300);
  if (
    !vendorId ||
    !HOTEL_VENDOR_STATUSES.includes(status as (typeof HOTEL_VENDOR_STATUSES)[number]) ||
    expectedVersion === null ||
    note.length < 8
  ) {
    return null;
  }
  return { expectedVersion, note, status, vendorId };
}

export function hotelVendorRequestFingerprint(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
