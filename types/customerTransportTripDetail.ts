export const CUSTOMER_TRANSPORT_PRODUCTS = ['FLIGHT', 'BUS', 'CAR'] as const;

export type CustomerTransportProduct = (typeof CUSTOMER_TRANSPORT_PRODUCTS)[number];
export type CustomerTransportBookingStatus =
  'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'UNDER_REVIEW';

export type CustomerTransportDetailFact = Readonly<{
  label: string;
  value: string;
}>;

export type CustomerTransportServicingEvent = Readonly<{
  at: string;
  description: string;
  key: string;
  kind: 'BOOKING' | 'SUPPORT';
  status: 'CLOSED' | 'OPEN' | 'RECORDED' | 'UNDER_REVIEW';
  title: string;
}>;

export type CustomerTransportTripDetail = Readonly<{
  bookedAt: string;
  bookingReference: string;
  bookingStatus: CustomerTransportBookingStatus;
  currency: 'INR' | null;
  endDate: string | null;
  facts: readonly CustomerTransportDetailFact[];
  fulfillment: Readonly<{
    message: string;
    status: 'PROVIDER_CONNECTION_PENDING';
  }>;
  product: CustomerTransportProduct;
  servicingHistory: readonly CustomerTransportServicingEvent[];
  startDate: string | null;
  subtitle: string;
  title: string;
  totalAmount: number | null;
}>;
