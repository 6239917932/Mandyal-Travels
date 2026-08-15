import type { FlightResultControls } from '@/types/flight';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const defaultFlightResultControls: FlightResultControls = {
  refundableOnly: false,
  sort: 'price-ascending',
};

export function createFlightResultControls(
  params: Record<string, string | string[] | undefined>,
): FlightResultControls {
  const maximumTotalPrice = Number(first(params.maximumTotalPrice));
  const sort = first(params.sort);
  const airline = first(params.airline)?.trim().toUpperCase();
  return {
    airline: airline && /^[A-Z0-9]{2,3}$/.test(airline) ? airline : undefined,
    maximumTotalPrice:
      Number.isFinite(maximumTotalPrice) && maximumTotalPrice > 0 && maximumTotalPrice <= 10_000_000
        ? maximumTotalPrice
        : undefined,
    refundableOnly: first(params.refundableOnly) === 'true',
    sort:
      sort === 'duration-ascending' || sort === 'departure-ascending'
        ? sort
        : defaultFlightResultControls.sort,
  };
}
