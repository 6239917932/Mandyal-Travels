import type { FlightOffer, FlightSearchCriteria, FlightSegment } from '../../types/flight.ts';

const AIRPORT_CODE_PATTERN = /^[A-Z]{3}$/;
const MAX_ADULTS_PER_SEARCH = 9;

export interface FlightSearchClock {
  today: string;
}

export function validateFlightSearchCriteria(
  criteria: FlightSearchCriteria,
  clock: FlightSearchClock,
): void {
  if (!AIRPORT_CODE_PATTERN.test(criteria.origin)) {
    throw new Error('Origin must be a valid three-letter airport code.');
  }
  if (!AIRPORT_CODE_PATTERN.test(criteria.destination)) {
    throw new Error('Destination must be a valid three-letter airport code.');
  }
  if (criteria.origin === criteria.destination) {
    throw new Error('Origin and destination must be different.');
  }
  if (!Number.isInteger(criteria.adults) || criteria.adults < 1 || criteria.adults > MAX_ADULTS_PER_SEARCH) {
    throw new Error(`Adults must be between 1 and ${MAX_ADULTS_PER_SEARCH}.`);
  }
  if (criteria.departureDate < clock.today) {
    throw new Error('Departure date cannot be in the past.');
  }
  if (
    criteria.tripType === 'return' &&
    (!criteria.returnDate || criteria.returnDate <= criteria.departureDate)
  ) {
    throw new Error('Return date must be later than departure date.');
  }
}

function isValidSegment(segment: FlightSegment): boolean {
  const departure = Date.parse(segment.departureAt);
  const arrival = Date.parse(segment.arrivalAt);
  return (
    AIRPORT_CODE_PATTERN.test(segment.departureAirport) &&
    AIRPORT_CODE_PATTERN.test(segment.arrivalAirport) &&
    Number.isFinite(departure) &&
    Number.isFinite(arrival) &&
    arrival > departure &&
    Number.isInteger(segment.durationMinutes) &&
    segment.durationMinutes > 0 &&
    Number.isInteger(segment.stops) &&
    segment.stops >= 0
  );
}

export function normalizeFlightOffer(
  offer: FlightOffer,
  criteria: FlightSearchCriteria,
): FlightOffer | undefined {
  const outboundSegments = offer.segments.filter((segment) => segment.leg === 'outbound');
  const returnSegments = offer.segments.filter((segment) => segment.leg === 'return');
  const firstOutbound = outboundSegments[0];
  const lastOutbound = outboundSegments.at(-1);
  const firstReturn = returnSegments[0];
  const lastReturn = returnSegments.at(-1);
  if (
    !firstOutbound ||
    !lastOutbound ||
    !offer.id.trim() ||
    !offer.supplier.trim() ||
    offer.currency !== 'INR' ||
    !Number.isFinite(offer.pricePerAdult) ||
    offer.pricePerAdult <= 0 ||
    !Number.isInteger(offer.seatsRemaining) ||
    offer.seatsRemaining < criteria.adults ||
    offer.cabinClass !== criteria.cabinClass ||
    firstOutbound.departureAirport !== criteria.origin ||
    lastOutbound.arrivalAirport !== criteria.destination ||
    firstOutbound.departureAt.slice(0, 10) !== criteria.departureDate ||
    offer.segments.some((segment) => !isValidSegment(segment))
  ) {
    return undefined;
  }

  if (criteria.tripType === 'one-way' && returnSegments.length > 0) return undefined;
  if (
    criteria.tripType === 'return' &&
    (!criteria.returnDate ||
      !firstReturn ||
      !lastReturn ||
      firstReturn.departureAirport !== criteria.destination ||
      lastReturn.arrivalAirport !== criteria.origin ||
      firstReturn.departureAt.slice(0, 10) !== criteria.returnDate)
  ) {
    return undefined;
  }

  for (const leg of [outboundSegments, returnSegments]) {
    for (let index = 1; index < leg.length; index += 1) {
      const previous = leg[index - 1];
      const current = leg[index];
      if (!previous || !current || previous.arrivalAirport !== current.departureAirport) {
        return undefined;
      }
    }
  }

  return {
    ...offer,
    segments: offer.segments.map((segment) => ({ ...segment })),
    totalPrice: offer.pricePerAdult * criteria.adults,
  };
}
