export type CustomerSupportTimelineEntry = {
  label: string;
  recordedAt: Date;
};

export type CustomerSupportCaseDetail = {
  bookingReference: string | null;
  caseNumber: string;
  categoryLabel: string;
  createdAt: Date;
  events: CustomerSupportTimelineEntry[];
  hasEarlierEvents: boolean;
  message: string;
  resolutionNote: string | null;
  statusLabel: string;
  subject: string;
  updatedAt: Date;
};
