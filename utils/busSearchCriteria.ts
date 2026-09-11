import type { BusSearchCriteria } from '@/types/bus';
import { formatIndiaCalendarDate } from './localDate.ts';

export function createDefaultBusSearchCriteria(now: Date = new Date()): BusSearchCriteria {
  return {
    destination: 'Delhi',
    origin: 'Chandigarh',
    passengers: 1,
    travelDate: formatIndiaCalendarDate(now),
  };
}

export const defaultBusSearchCriteria = createDefaultBusSearchCriteria();

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function createBusSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): BusSearchCriteria {
  const defaults = createDefaultBusSearchCriteria();
  const passengers = Number(first(params.passengers));
  return {
    destination: (first(params.destination) ?? defaults.destination).trim(),
    origin: (first(params.origin) ?? defaults.origin).trim(),
    passengers:
      Number.isInteger(passengers) && passengers >= 1 && passengers <= 6
        ? passengers
        : defaults.passengers,
    travelDate: first(params.travelDate) ?? defaults.travelDate,
  };
}

export function busSearchCriteriaToQuery(criteria: BusSearchCriteria): Record<string, string> {
  return {
    destination: criteria.destination,
    origin: criteria.origin,
    passengers: String(criteria.passengers),
    travelDate: criteria.travelDate,
  };
}
