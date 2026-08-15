import type { FlightOffer, FlightResultControls } from '@/types/flight';

const totalDuration = (offer: FlightOffer) =>
  offer.segments.reduce((total, segment) => total + segment.durationMinutes, 0);

export function applyFlightResultControls(
  offers: FlightOffer[],
  controls: FlightResultControls,
): FlightOffer[] {
  const airline = controls.airline?.trim().toUpperCase();
  const filtered = offers.filter((offer) => {
    if (controls.refundableOnly && !offer.refundable) return false;
    if (controls.maximumTotalPrice !== undefined && offer.totalPrice > controls.maximumTotalPrice) {
      return false;
    }
    if (airline && !offer.segments.some((segment) => segment.airlineCode === airline)) return false;
    return true;
  });

  return filtered.toSorted((first, second) => {
    if (controls.sort === 'duration-ascending') {
      return totalDuration(first) - totalDuration(second) || first.totalPrice - second.totalPrice;
    }
    if (controls.sort === 'departure-ascending') {
      return (
        first.segments[0].departureAt.localeCompare(second.segments[0].departureAt) ||
        first.totalPrice - second.totalPrice
      );
    }
    return first.totalPrice - second.totalPrice;
  });
}
