import type {
  CustomerHotelBookingStatus,
  CustomerHotelStayStatus,
} from '@/types/customerHotelBookingDetail';

const HOTEL_REFERENCE_PATTERN = /^MT[A-F0-9]{12}$/;

export function normalizeHotelBookingReference(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  return HOTEL_REFERENCE_PATTERN.test(normalized) ? normalized : undefined;
}

export function customerHotelBookingStatus(value: string): CustomerHotelBookingStatus {
  switch (value.trim().toLowerCase()) {
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'pending':
    case 'processing':
      return 'PROCESSING';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerHotelStayStatus(
  bookingStatus: CustomerHotelBookingStatus,
  value: string,
): CustomerHotelStayStatus {
  if (bookingStatus === 'CANCELLED') return 'CANCELLED';
  if (bookingStatus !== 'CONFIRMED') return 'UNDER_REVIEW';

  switch (value.trim().toUpperCase()) {
    case 'RESERVED':
      return 'UPCOMING';
    case 'CHECKED_IN':
      return 'CHECKED_IN';
    case 'CHECKED_OUT':
      return 'COMPLETED';
    case 'NO_SHOW':
      return 'DID_NOT_CHECK_IN';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerHotelCreatedEventStatus(
  bookingStatus: CustomerHotelBookingStatus,
): 'CONFIRMED' | 'UNDER_REVIEW' {
  return bookingStatus === 'CONFIRMED' ? 'CONFIRMED' : 'UNDER_REVIEW';
}
