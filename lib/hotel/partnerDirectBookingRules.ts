import { isValidEmail, isValidName, normalizeEmail } from '../auth/validation.ts';
import type { CreatePartnerDirectBookingRequest, HotelQuoteRequest } from '../../types/commerce.ts';

export const PARTNER_DIRECT_IDEMPOTENCY_PATTERN =
  /^partner-direct-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

export function parsePartnerDirectQuoteRequest(
  value: Record<string, unknown>,
): HotelQuoteRequest | null {
  const request = {
    adults: Number(value.adults),
    checkInDate: String(value.checkInDate ?? ''),
    checkOutDate: String(value.checkOutDate ?? ''),
    children: Number(value.children),
    hotelSlug: String(value.hotelSlug ?? '').trim(),
    ratePlanId: String(value.ratePlanId ?? '').trim(),
    rooms: Number(value.rooms),
    roomTypeId: String(value.roomTypeId ?? '').trim(),
  };
  const today = new Date().toISOString().slice(0, 10);
  if (
    !isCalendarDate(request.checkInDate) ||
    !isCalendarDate(request.checkOutDate) ||
    request.checkInDate < today ||
    request.checkOutDate <= request.checkInDate ||
    !integer(request.rooms, 1, 20) ||
    !integer(request.adults, 1, 100) ||
    !integer(request.children, 0, 100) ||
    !request.hotelSlug ||
    request.hotelSlug.length > 120 ||
    !request.roomTypeId ||
    request.roomTypeId.length > 160 ||
    !request.ratePlanId ||
    request.ratePlanId.length > 160
  ) {
    return null;
  }
  return request;
}

export function parsePartnerDirectBookingRequest(
  value: Record<string, unknown>,
): CreatePartnerDirectBookingRequest | null {
  const guest =
    value.guest && typeof value.guest === 'object' && !Array.isArray(value.guest)
      ? (value.guest as Record<string, unknown>)
      : null;
  if (!guest) return null;
  const request: CreatePartnerDirectBookingRequest = {
    availabilityLockId: String(value.availabilityLockId ?? '').trim(),
    guest: {
      email: normalizeEmail(String(guest.email ?? '')),
      firstName: String(guest.firstName ?? '').trim(),
      lastName: String(guest.lastName ?? '').trim(),
      phone: String(guest.phone ?? '').trim(),
      specialRequests: String(guest.specialRequests ?? '').trim(),
    },
    hotelSlug: String(value.hotelSlug ?? '').trim(),
    quoteId: String(value.quoteId ?? '').trim(),
  };
  if (
    !request.availabilityLockId ||
    request.availabilityLockId.length > 200 ||
    !request.quoteId ||
    request.quoteId.length > 200 ||
    !request.hotelSlug ||
    request.hotelSlug.length > 120 ||
    !isValidEmail(request.guest.email) ||
    !isValidName(request.guest.firstName) ||
    !isValidName(request.guest.lastName) ||
    request.guest.phone.length < 7 ||
    request.guest.phone.length > 32 ||
    request.guest.specialRequests.length > 1_000
  ) {
    return null;
  }
  return request;
}
