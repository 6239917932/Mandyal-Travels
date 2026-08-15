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
  const tripType = trip === 'return' || trip === 'multi-city' ? trip : 'one-way';
  const origin = (first(params.origin) ?? defaultFlightSearchCriteria.origin).trim().toUpperCase();
  const destination = (first(params.destination) ?? defaultFlightSearchCriteria.destination)
    .trim()
    .toUpperCase();
  const departureDate = first(params.departureDate) ?? defaultFlightSearchCriteria.departureDate;
  const segment2Origin = (first(params.segment2Origin) ?? destination).trim().toUpperCase();
  const segment2Destination = (first(params.segment2Destination) ?? 'BLR').trim().toUpperCase();
  const segment2Date = first(params.segment2Date) ?? '2026-09-18';
  const segment3Origin = first(params.segment3Origin)?.trim().toUpperCase();
  const segment3Destination = first(params.segment3Destination)?.trim().toUpperCase();
  const segment3Date = first(params.segment3Date)?.trim();
  const multiCitySegments =
    tripType === 'multi-city'
      ? [
          { departureDate, destination, origin },
          { departureDate: segment2Date, destination: segment2Destination, origin: segment2Origin },
          ...(segment3Origin && segment3Destination && segment3Date
            ? [
                {
                  departureDate: segment3Date,
                  destination: segment3Destination,
                  origin: segment3Origin,
                },
              ]
            : []),
        ]
      : undefined;
  return {
    adults:
      Number.isInteger(adults) && adults >= 1 && adults <= 9
        ? adults
        : defaultFlightSearchCriteria.adults,
    cabinClass: cabin === 'business' || cabin === 'premium-economy' ? cabin : 'economy',
    departureDate,
    destination,
    multiCitySegments,
    origin,
    returnDate: first(params.returnDate),
    tripType,
  };
}

export function flightSearchCriteriaToQuery(
  criteria: FlightSearchCriteria,
): Record<string, string> {
  const query: Record<string, string> = {
    adults: String(criteria.adults),
    cabinClass: criteria.cabinClass,
    departureDate: criteria.departureDate,
    destination: criteria.destination,
    origin: criteria.origin,
    tripType: criteria.tripType,
  };
  if (criteria.returnDate) query.returnDate = criteria.returnDate;
  criteria.multiCitySegments?.slice(1).forEach((segment, index) => {
    const number = index + 2;
    query[`segment${number}Origin`] = segment.origin;
    query[`segment${number}Destination`] = segment.destination;
    query[`segment${number}Date`] = segment.departureDate;
  });
  return query;
}
