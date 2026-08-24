export type CustomerHotelBookingStatus = 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'UNDER_REVIEW';

export type CustomerHotelStayStatus =
  'CANCELLED' | 'CHECKED_IN' | 'COMPLETED' | 'DID_NOT_CHECK_IN' | 'UPCOMING' | 'UNDER_REVIEW';

export type CustomerHotelServicingEvent = {
  at: string;
  description: string;
  key: string;
  kind: 'BOOKING' | 'DATE_CHANGE' | 'SUPPORT';
  status:
    | 'APPROVED'
    | 'CLOSED'
    | 'CONFIRMED'
    | 'NOT_APPROVED'
    | 'OPEN'
    | 'REQUEST_RECEIVED'
    | 'UNDER_REVIEW';
  title: string;
};

export type CustomerHotelBookingDetail = {
  bookedAt: string;
  bookingReference: string;
  bookingStatus: CustomerHotelBookingStatus;
  currency: string;
  hotelName: string;
  rooms: number;
  servicingHistory: CustomerHotelServicingEvent[];
  stay: {
    checkInDate: string;
    checkOutDate: string;
    status: CustomerHotelStayStatus;
  };
  totalAmount: number;
};
