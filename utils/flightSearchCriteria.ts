import type { FlightSearchCriteria } from '@/types/flight';

export const defaultFlightSearchCriteria: FlightSearchCriteria = {
  adults: 1,
  cabinClass: 'economy',
  departureDate: '2026-09-15',
  destination: 'BOM',
  origin: 'DEL',
  tripType: 'one-way',
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function createFlightSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): FlightSearchCriteria {
  const adults = Number(first(params.adults));
  const cabin = first(params.cabinClass);
  const trip = first(params.tripType);
  return {
    adults: Number.isInteger(adults) && adults > 0 ? adults : defaultFlightSearchCriteria.adults,
    cabinClass: cabin === 'business' || cabin === 'premium-economy' ? cabin : 'economy',
    departureDate: first(params.departureDate) ?? defaultFlightSearchCriteria.departureDate,
    destination: (first(params.destination) ?? defaultFlightSearchCriteria.destination)
      .trim()
      .toUpperCase(),
    origin: (first(params.origin) ?? defaultFlightSearchCriteria.origin).trim().toUpperCase(),
    returnDate: first(params.returnDate),
    tripType: trip === 'return' ? 'return' : 'one-way',
  };
}
