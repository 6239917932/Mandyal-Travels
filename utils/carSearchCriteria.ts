import type { CarSearchCriteria } from '@/types/car';

export const defaultCarSearchCriteria: CarSearchCriteria = {
  pickupLocation: 'Delhi',
  dropoffLocation: 'Delhi',
  pickupDate: '2026-10-10',
  dropoffDate: '2026-10-13',
  drivers: 1,
};
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export function createCarSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): CarSearchCriteria {
  const drivers = Number(first(params.drivers));
  return {
    pickupLocation: (
      first(params.pickupLocation) ?? defaultCarSearchCriteria.pickupLocation
    ).trim(),
    dropoffLocation: (
      first(params.dropoffLocation) ?? defaultCarSearchCriteria.dropoffLocation
    ).trim(),
    pickupDate: first(params.pickupDate) ?? defaultCarSearchCriteria.pickupDate,
    dropoffDate: first(params.dropoffDate) ?? defaultCarSearchCriteria.dropoffDate,
    drivers: Number.isInteger(drivers) && drivers >= 1 && drivers <= 4 ? drivers : 1,
  };
}
