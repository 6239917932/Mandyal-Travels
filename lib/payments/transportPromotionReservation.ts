export type TransportPromotionProduct = 'BUS' | 'CAR' | 'FLIGHT';

type ReservationResponse = Readonly<{
  data?: Readonly<{ finalTotal: number; reservationToken: string }>;
  error?: Readonly<{ message?: string }>;
}>;

export class TransportPromotionReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportPromotionReservationError';
  }
}

export async function reserveTransportPromotion(
  input: Readonly<{
    businessSelection: unknown;
    businessTravelRequestId?: string;
    confirmationCode: string;
    expectedTotal: number;
    productType: TransportPromotionProduct;
    promotionCode?: string;
  }>,
): Promise<string | undefined> {
  if (!input.promotionCode) return undefined;
  const response = await fetch('/api/v1/promotions/reservations', {
    body: JSON.stringify({
      businessSelection: input.businessSelection,
      businessTravelRequestId: input.businessTravelRequestId,
      confirmationCode: input.confirmationCode,
      productType: input.productType,
      promotionCode: input.promotionCode,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const result = (await response.json().catch(() => undefined)) as ReservationResponse | undefined;
  if (
    !response.ok ||
    !result?.data ||
    result.data.finalTotal !== input.expectedTotal ||
    !result.data.reservationToken
  ) {
    throw new TransportPromotionReservationError(
      result?.error?.message ??
        'The promotion could not be reserved safely. No payment has been captured.',
    );
  }
  return result.data.reservationToken;
}
