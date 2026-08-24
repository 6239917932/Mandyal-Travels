export const CUSTOMER_TRAVEL_HISTORY_PRODUCTS = ['FLIGHT', 'BUS', 'CAR', 'HOTEL'] as const;
export type CustomerTravelHistoryProduct = (typeof CUSTOMER_TRAVEL_HISTORY_PRODUCTS)[number];

export type CustomerTravelHistoryStatus = 'CANCELLED' | 'CONFIRMED' | 'PROCESSING' | 'UNDER_REVIEW';

export type CustomerTravelHistoryDocument = Readonly<{
  href: string;
  label: 'View itinerary' | 'View ticket' | 'View voucher';
}>;

export type CustomerTravelHistoryEntry = Readonly<{
  bookingReference: string;
  currency: 'INR' | null;
  detailHref: string;
  document: CustomerTravelHistoryDocument | null;
  endDate: string | null;
  product: CustomerTravelHistoryProduct;
  startDate: string | null;
  status: CustomerTravelHistoryStatus;
  subtitle: string;
  title: string;
  totalAmount: number | null;
}>;

export type CustomerTravelHistoryPage = Readonly<{
  count: number;
  entries: readonly CustomerTravelHistoryEntry[];
  isCapped: boolean;
  page: number;
  pages: number;
}>;

export type CustomerTravelHistoryDirectory = Readonly<{
  hotels: CustomerTravelHistoryPage;
  transport: CustomerTravelHistoryPage;
}>;
