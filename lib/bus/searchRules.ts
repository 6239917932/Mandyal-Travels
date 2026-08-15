import type { BusOffer, BusSearchCriteria } from '../../types/bus.ts';

const MAX_PASSENGERS = 6;

export function validateBusSearchCriteria(criteria: BusSearchCriteria, today: string): void {
  if (criteria.origin.length < 2 || criteria.origin.length > 100) {
    throw new Error('Enter a valid origin.');
  }
  if (criteria.destination.length < 2 || criteria.destination.length > 100) {
    throw new Error('Enter a valid destination.');
  }
  if (
    criteria.origin.localeCompare(criteria.destination, undefined, { sensitivity: 'base' }) === 0
  ) {
    throw new Error('Origin and destination must be different.');
  }
  if (
    !Number.isInteger(criteria.passengers) ||
    criteria.passengers < 1 ||
    criteria.passengers > MAX_PASSENGERS
  ) {
    throw new Error(`Passengers must be between 1 and ${MAX_PASSENGERS}.`);
  }
  if (criteria.travelDate < today) throw new Error('Travel date cannot be in the past.');
}

export function normalizeBusOffer(
  offer: BusOffer,
  criteria: BusSearchCriteria,
): BusOffer | undefined {
  const departure = Date.parse(offer.departureAt);
  const arrival = Date.parse(offer.arrivalAt);
  if (
    !offer.id.trim() ||
    !offer.operatorName.trim() ||
    !offer.source.trim() ||
    offer.origin.localeCompare(criteria.origin, undefined, { sensitivity: 'base' }) !== 0 ||
    offer.destination.localeCompare(criteria.destination, undefined, { sensitivity: 'base' }) !==
      0 ||
    offer.departureAt.slice(0, 10) !== criteria.travelDate ||
    !Number.isFinite(departure) ||
    !Number.isFinite(arrival) ||
    arrival <= departure ||
    offer.currency !== 'INR' ||
    !Number.isFinite(offer.pricePerSeat) ||
    offer.pricePerSeat <= 0 ||
    !Number.isInteger(offer.seatsRemaining) ||
    offer.seatsRemaining < criteria.passengers ||
    !Number.isFinite(offer.rating) ||
    offer.rating < 0 ||
    offer.rating > 5
  ) {
    return undefined;
  }
  return {
    ...offer,
    amenities: [...new Set(offer.amenities.map((value) => value.trim()).filter(Boolean))].slice(
      0,
      30,
    ),
    totalPrice: offer.pricePerSeat * criteria.passengers,
  };
}
