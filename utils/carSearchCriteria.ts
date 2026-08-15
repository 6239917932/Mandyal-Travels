import type { CarSearchCriteria } from '@/types/car';

export const defaultCarSearchCriteria: CarSearchCriteria = {
  pickupLocation: 'Delhi',
  dropoffLocation: 'Delhi',
  pickupDate: '2026-10-10',
  pickupTime: '10:00',
  dropoffDate: '2026-10-13',
  dropoffTime: '10:00',
  drivers: 1,
  rentalMode: 'self-drive',
};
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export function createCarSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): CarSearchCriteria {
  const drivers = Number(first(params.drivers));
  const rentalMode = first(params.rentalMode);
  return {
    pickupLocation: (
      first(params.pickupLocation) ?? defaultCarSearchCriteria.pickupLocation
    ).trim(),
    dropoffLocation: (
      first(params.dropoffLocation) ?? defaultCarSearchCriteria.dropoffLocation
    ).trim(),
    pickupDate: first(params.pickupDate) ?? defaultCarSearchCriteria.pickupDate,
    pickupTime: first(params.pickupTime) ?? defaultCarSearchCriteria.pickupTime,
    dropoffDate: first(params.dropoffDate) ?? defaultCarSearchCriteria.dropoffDate,
    dropoffTime: first(params.dropoffTime) ?? defaultCarSearchCriteria.dropoffTime,
    drivers: Number.isInteger(drivers) && drivers >= 1 && drivers <= 4 ? drivers : 1,
    rentalMode: rentalMode === 'chauffeur' ? 'chauffeur' : 'self-drive',
  };
}
