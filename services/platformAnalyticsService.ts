export type OperationalAnalyticsInput = {
  activeSuppliers: number;
  capturedCheckoutIntents: number;
  confirmedFunnelEvents: number;
  highRiskSignals: number;
  hotelBookings: number;
  hotelCancellations: number;
  openBusinessSupportCases: number;
  openCustomerSupportCases: number;
  publishedHotelProperties: number;
  searchFunnelEvents: number;
  totalCheckoutIntents: number;
  totalHotelProperties: number;
  totalSuppliers: number;
};

export type OperationalAnalyticsSnapshot = OperationalAnalyticsInput & {
  activeSupplierPercent: number | null;
  capturedCheckoutPercent: number | null;
  hotelCancellationPercent: number | null;
  openSupportCases: number;
  publishedHotelPercent: number | null;
  trackedConversionPercent: number | null;
};

export function analyticsPercent(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.round((Math.max(0, numerator) / denominator) * 1_000) / 10;
}

export function buildOperationalAnalyticsSnapshot(
  input: OperationalAnalyticsInput,
): OperationalAnalyticsSnapshot {
  return {
    ...input,
    activeSupplierPercent: analyticsPercent(input.activeSuppliers, input.totalSuppliers),
    capturedCheckoutPercent: analyticsPercent(
      input.capturedCheckoutIntents,
      input.totalCheckoutIntents,
    ),
    hotelCancellationPercent: analyticsPercent(input.hotelCancellations, input.hotelBookings),
    openSupportCases: input.openBusinessSupportCases + input.openCustomerSupportCases,
    publishedHotelPercent: analyticsPercent(
      input.publishedHotelProperties,
      input.totalHotelProperties,
    ),
    trackedConversionPercent: analyticsPercent(
      input.confirmedFunnelEvents,
      input.searchFunnelEvents,
    ),
  };
}

export function formatAnalyticsPercent(value: number | null): string {
  return value === null ? 'Not enough data' : `${value}%`;
}

export type PartnerSettlementAggregate = {
  bookingCount: number | null;
  commissionAmount: number | null;
  grossAmount: number | null;
  netAmount: number | null;
  partnerId: string;
  settlementCount: number;
};

export type PartnerAnalyticsIdentity = {
  id: string;
  name: string;
  status: string;
  type: string;
};

export type PartnerPerformanceRow = {
  bookingCount: number;
  commissionAmount: number;
  commissionPercent: number | null;
  grossAmount: number;
  name: string;
  netAmount: number;
  partnerId: string;
  settlementCount: number;
  status: string;
  type: string;
};

function safeAnalyticsInteger(value: number | null): number {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? (value ?? 0) : 0;
}

export function buildPartnerPerformanceRows(
  aggregates: readonly PartnerSettlementAggregate[],
  identities: readonly PartnerAnalyticsIdentity[],
): PartnerPerformanceRow[] {
  const identityById = new Map(identities.map((identity) => [identity.id, identity]));

  return aggregates.map((aggregate) => {
    const identity = identityById.get(aggregate.partnerId);
    const grossAmount = safeAnalyticsInteger(aggregate.grossAmount);
    const commissionAmount = safeAnalyticsInteger(aggregate.commissionAmount);

    return {
      bookingCount: safeAnalyticsInteger(aggregate.bookingCount),
      commissionAmount,
      commissionPercent: analyticsPercent(commissionAmount, grossAmount),
      grossAmount,
      name: identity?.name.trim() || 'Partner record',
      netAmount: safeAnalyticsInteger(aggregate.netAmount),
      partnerId: aggregate.partnerId,
      settlementCount: safeAnalyticsInteger(aggregate.settlementCount),
      status: identity?.status || 'UNKNOWN',
      type: identity?.type || 'UNKNOWN',
    };
  });
}

export function formatAnalyticsCurrency(value: number): string {
  return `₹${Math.max(0, value).toLocaleString('en-IN')}`;
}
