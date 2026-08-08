import type { HotelSearchCriteria } from '@/types/hotel';

export const defaultHotelSearchCriteria: HotelSearchCriteria = {
  adults: 2,
  checkInDate: '2026-10-18',
  checkOutDate: '2026-10-21',
  children: 0,
  destination: '',
  rooms: 1,
};

function getFirstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function getNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

export function createHotelSearchCriteria(
  searchParams: Record<string, string | string[] | undefined>,
): HotelSearchCriteria {
  return {
    adults: getPositiveInteger(
      getFirstValue(searchParams.adults),
      defaultHotelSearchCriteria.adults,
    ),
    checkInDate: getFirstValue(searchParams.checkInDate) ?? defaultHotelSearchCriteria.checkInDate,
    checkOutDate:
      getFirstValue(searchParams.checkOutDate) ?? defaultHotelSearchCriteria.checkOutDate,
    children: getNonNegativeInteger(
      getFirstValue(searchParams.children),
      defaultHotelSearchCriteria.children,
    ),
    destination: getFirstValue(searchParams.destination) ?? defaultHotelSearchCriteria.destination,
    rooms: getPositiveInteger(getFirstValue(searchParams.rooms), defaultHotelSearchCriteria.rooms),
  };
}
