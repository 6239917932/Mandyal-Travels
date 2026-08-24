export const ADMIN_BOOKING_PRODUCTS = ['HOTEL', 'FLIGHT', 'BUS', 'CAR'] as const;

export type AdminBookingProduct = (typeof ADMIN_BOOKING_PRODUCTS)[number];
export type AdminTransportBookingProduct = Exclude<AdminBookingProduct, 'HOTEL'>;
export type AdminDocumentReadiness = 'BLOCKED' | 'READY' | 'REVIEW' | 'UNAVAILABLE';

export type AdminBookingDossierFact = Readonly<{
  label: string;
  value: string;
}>;

export type AdminBookingDossierTraveller = Readonly<{
  displayName: string;
  email: string;
  userId: string | null;
}>;

export type AdminBookingAmendmentSummary = Readonly<{
  createdAt: Date;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
  requestedTotalAmount: number | null;
  reviewedAt: Date | null;
  status: string;
}>;

export type AdminBookingRefundSummary = Readonly<{
  amount: number;
  createdAt: Date;
  currency: string;
  reviewedAt: Date | null;
  status: string;
}>;

export type AdminBookingSupportSummary = Readonly<{
  caseNumber: string;
  category: string;
  status: string;
  updatedAt: Date;
}>;

export type AdminBookingDocumentSummary = Readonly<{
  billing: AdminDocumentReadiness;
  confirmation: AdminDocumentReadiness;
  reason: string;
}>;

export type AdminBookingDossierLinks = Readonly<{
  amendments: string | null;
  customer: string;
  directory: string;
  documents: string;
  finance: string | null;
  support: string;
}>;

export type AdminBookingDossier = Readonly<{
  amendments: Readonly<{
    available: boolean;
    items: readonly AdminBookingAmendmentSummary[];
    total: number;
  }>;
  confirmationCode: string;
  createdAt: Date;
  currency: string;
  documents: AdminBookingDocumentSummary;
  endDate: string | null;
  facts: readonly AdminBookingDossierFact[];
  kind: 'HOTEL' | 'TRANSPORT';
  links: AdminBookingDossierLinks;
  operationalStatus: string | null;
  product: AdminBookingProduct;
  refunds: Readonly<{
    available: boolean;
    items: readonly AdminBookingRefundSummary[];
    total: number;
  }>;
  startDate: string;
  status: string;
  subtitle: string;
  support: Readonly<{
    items: readonly AdminBookingSupportSummary[];
    total: number;
  }>;
  title: string;
  totalAmount: number;
  traveller: AdminBookingDossierTraveller;
}>;
