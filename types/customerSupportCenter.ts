export type CustomerSupportCategory = 'ACCOUNT' | 'BOOKING' | 'OTHER' | 'PAYMENT' | 'TECHNICAL';

export type CustomerServicingIntent = 'CANCELLATION_REQUEST' | 'CHANGE_REQUEST' | 'GENERAL_HELP';

export type CustomerSupportPublicStatus = 'CLOSED' | 'OPEN';

export type CustomerSupportCaseSummary = {
  bookingReference: string | null;
  caseNumber: string;
  categoryLabel: string;
  createdAt: Date;
  id: string;
  message: string;
  resolutionNote: string | null;
  statusLabel: string;
  subject: string;
  updatedAt: Date;
};

export type CustomerSupportCenterResult = {
  cases: CustomerSupportCaseSummary[];
  closedCases: number;
  openCases: number;
  page: number;
  query: string;
  status: 'ALL' | CustomerSupportPublicStatus;
  totalCases: number;
  totalPages: number;
};
