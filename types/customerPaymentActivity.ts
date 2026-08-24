export type CustomerPaymentStatus =
  'PAID' | 'PROCESSING' | 'UNSUCCESSFUL' | 'REFUNDED' | 'UNDER_REVIEW';

export type CustomerRefundStatus =
  'REQUEST_RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'NOT_APPROVED' | 'DELAYED' | 'UNDER_REVIEW';

export type CustomerHotelBookingStatus = 'CONFIRMED' | 'CANCELLED' | 'PROCESSING' | 'UNDER_REVIEW';

export type CustomerRefundActivity = {
  amount: number;
  createdAt: string;
  currency: string;
  resolvedAt: string | null;
  status: CustomerRefundStatus;
};

export type CustomerPaymentActivity = {
  bookingReference: string;
  bookingStatus: CustomerHotelBookingStatus;
  createdAt: string;
  currency: string;
  hotelName: string;
  paymentAmount: number;
  paymentStatus: CustomerPaymentStatus;
  refundCount: number;
  refunds: CustomerRefundActivity[];
  stay: {
    checkInDate: string;
    checkOutDate: string;
  };
  updatedAt: string;
};

export type CustomerPaymentActivityPage = {
  activities: CustomerPaymentActivity[];
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
};
