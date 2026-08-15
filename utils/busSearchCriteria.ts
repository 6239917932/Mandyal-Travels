import type { BusSearchCriteria } from '@/types/bus';

export const defaultBusSearchCriteria: BusSearchCriteria = {
  destination: 'Delhi',
  origin: 'Chandigarh',
  passengers: 1,
  travelDate: '2026-09-20',
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function createBusSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): BusSearchCriteria {
  const passengers = Number(first(params.passengers));
  return {
    destination: (first(params.destination) ?? defaultBusSearchCriteria.destination).trim(),
    origin: (first(params.origin) ?? defaultBusSearchCriteria.origin).trim(),
    passengers:
      Number.isInteger(passengers) && passengers >= 1 && passengers <= 6
        ? passengers
        : defaultBusSearchCriteria.passengers,
    travelDate: first(params.travelDate) ?? defaultBusSearchCriteria.travelDate,
  };
}

export function busSearchCriteriaToQuery(criteria: BusSearchCriteria): Record<string, string> {
  return { destination: criteria.destination, origin: criteria.origin, passengers: String(criteria.passengers), travelDate: criteria.travelDate };
}
