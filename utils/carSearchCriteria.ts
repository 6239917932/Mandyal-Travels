import type { CarSearchCriteria } from '@/types/car';
import { formatIndiaCalendarDate, offsetLocalCalendarDate } from './localDate.ts';

export function createDefaultCarSearchCriteria(now: Date = new Date()): CarSearchCriteria {
  const today = formatIndiaCalendarDate(now);
  return {
    pickupLocation: 'Delhi',
    dropoffLocation: 'Delhi',
    pickupDate: today,
    pickupTime: '10:00',
    dropoffDate: offsetLocalCalendarDate(today, 1),
    dropoffTime: '10:00',
    drivers: 1,
    rentalMode: 'self-drive',
  };
}

export const defaultCarSearchCriteria = createDefaultCarSearchCriteria();
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
export function createCarSearchCriteria(
  params: Record<string, string | string[] | undefined>,
): CarSearchCriteria {
  const defaults = createDefaultCarSearchCriteria();
  const drivers = Number(first(params.drivers));
  const rentalMode = first(params.rentalMode);
  return {
    pickupLocation: (first(params.pickupLocation) ?? defaults.pickupLocation).trim(),
    dropoffLocation: (first(params.dropoffLocation) ?? defaults.dropoffLocation).trim(),
    pickupDate: first(params.pickupDate) ?? defaults.pickupDate,
    pickupTime: first(params.pickupTime) ?? defaults.pickupTime,
    dropoffDate: first(params.dropoffDate) ?? defaults.dropoffDate,
    dropoffTime: first(params.dropoffTime) ?? defaults.dropoffTime,
    drivers: Number.isInteger(drivers) && drivers >= 1 && drivers <= 4 ? drivers : 1,
    rentalMode: rentalMode === 'chauffeur' ? 'chauffeur' : 'self-drive',
  };
}
