import type { CurrencyCode } from '@/types/hotel';

export type PriceComponentType = 'room-charge' | 'tax-and-fee';

export interface PriceComponent {
  amount: number;
  currency: CurrencyCode;
  label: string;
  type: PriceComponentType;
}

export interface HotelQuoteRequest {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelSlug: string;
  ratePlanId: string;
  rooms: number;
  roomTypeId: string;
}

export interface AvailabilityLock {
  checkInDate: string;
  checkOutDate: string;
  expiresAt: string;
  id: string;
  inventorySource: 'direct' | 'supplier';
  quantity: number;
  roomTypeId: string;
  status: 'active' | 'expired' | 'released' | 'converted';
}

export interface HotelQuote {
  availabilityLock: AvailabilityLock;
  checkInDate: string;
  checkOutDate: string;
  components: PriceComponent[];
  currency: CurrencyCode;
  expiresAt: string;
  hotelSlug: string;
  id: string;
  nights: number;
  quotedAt: string;
  ratePlanId: string;
  rooms: number;
  totalAmount: number;
}

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export interface BookingAmendmentRecord {
  createdAt: string;
  id: string;
  reason: string;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
  requestedTotalAmount?: number;
  reviewedAt?: string;
  reviewNote?: string;
  status: 'pending' | 'approved' | 'declined';
}

export interface PartnerAmendmentRecord extends BookingAmendmentRecord {
  booking: {
    confirmationCode: string;
    currency: CurrencyCode;
    guestName: string;
    hotelName: string;
    currentCheckInDate: string;
    currentCheckOutDate: string;
    currentTotalAmount: number;
    ratePlanName: string;
    roomName: string;
    rooms: number;
  };
}

export interface PartnerBookingRecord {
  assignedRoomNumbers: string[];
  confirmationCode: string;
  createdAt: string;
  currency: CurrencyCode;
  guestEmail: string;
  guestName: string;
  hotelName: string;
  operationalStatus: HotelBookingRecord['operationalStatus'];
  partnerNote: string;
  checkInDate: string;
  checkOutDate: string;
  paymentStatus: PaymentStatus;
  ratePlanName: string;
  roomName: string;
  rooms: number;
  specialRequests: string;
  status: HotelBookingRecord['status'];
  totalAmount: number;
}

export interface PartnerInventoryRecord {
  activeHolds: number;
  allocatedRooms: number;
  baseInventory: number;
  effectiveInventory: number;
  hotelName: string;
  inventorySource: string;
  overrideApplied: boolean;
  remainingRooms: number;
  roomName: string;
  roomTypeId: string;
}

export interface PartnerHotelCalendarRecord {
  availableRooms: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  hotelName: string;
  maximumStayNights?: number;
  minimumStayNights?: number;
  nightlyRate?: number;
  ratePlanName?: string;
  note: string;
  roomName: string;
  roomTypeId: string;
  stayDate: string;
  stopSell: boolean;
}

export interface PartnerInventoryRatePlanRecord {
  id: string;
  name: string;
  roomTypeId: string;
}

export interface HotelBookingRecord {
  assignedRoomNumbers: string[];
  availabilityLockId: string;
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  createdAt: string;
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    specialRequests: string;
  };
  hotelSlug: string;
  id: string;
  operationalStatus: 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';
  partnerNote?: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  quoteId: string;
  status: 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: CurrencyCode;
}

export interface ManagedHotelBooking extends HotelBookingRecord {
  cancellationPolicy?: string;
  hotelName: string;
  latestAmendment?: BookingAmendmentRecord;
  priceComponents?: PriceComponent[];
  ratePlanName?: string;
  refundable?: boolean;
  roomName?: string;
  rooms?: number;
}

export interface CreateHotelBookingRequest {
  availabilityLockId: string;
  businessTravelRequestId?: string;
  guest: HotelBookingRecord['guest'];
  hotelSlug: string;
  promotionCode?: string;
  quoteId: string;
}

export interface CreatedHotelBooking {
  accessToken: string;
  booking: HotelBookingRecord;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
