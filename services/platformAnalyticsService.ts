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
