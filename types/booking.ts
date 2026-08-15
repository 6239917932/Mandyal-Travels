import type { Hotel, HotelRatePlan, HotelRoom, Money } from '@/types/hotel';
import type { AvailabilityLock } from '@/types/commerce';

export type BookingStatus =
  'room-selected' | 'guest-details' | 'payment-pending' | 'confirmed' | 'cancelled';

export interface BookingGuest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  specialRequests: string;
}

export interface BookingPricing {
  roomCharges: Money;
  taxesAndFees: Money;
  total: Money;
}

export interface HotelBookingDraft {
  availabilityLock: AvailabilityLock;
  checkInDate: string;
  checkOutDate: string;
  guest?: BookingGuest;
  hotel: Hotel;
  pricing: BookingPricing;
  quoteExpiresAt: string;
  quoteId: string;
  ratePlan: HotelRatePlan;
  rooms: number;
  selectedRoom: HotelRoom;
  status: BookingStatus;
  confirmationCode?: string;
  bookingId?: string;
  paymentStatus?: 'pending' | 'captured' | 'failed' | 'refunded';
}
