import type { HotelSearchCriteria, HotelSearchFilters, HotelSearchSort } from '@/types/hotel';

export const defaultHotelSearchCriteria: HotelSearchCriteria = {
  adults: 2,
  checkInDate: '2026-10-18',
  checkOutDate: '2026-10-21',
  children: 0,
  destination: '',
  rooms: 1,
};

export const defaultHotelSearchFilters: HotelSearchFilters = {
  amenity: '',
  maximumNightlyRate: 0,
  minimumStarRating: 0,
  page: 1,
  refundableOnly: false,
  radiusKm: 0,
  sort: 'price-ascending',
};

function getFirstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSearchSort(value: string | undefined): HotelSearchSort {
  return value === 'price-descending' || value === 'rating-descending' ? value : 'price-ascending';
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function createHotelSearchFilters(
  searchParams: Record<string, string | string[] | undefined>,
): HotelSearchFilters {
  const minimumStarRating = getNonNegativeInteger(
    getFirstValue(searchParams.minimumStarRating),
    defaultHotelSearchFilters.minimumStarRating,
  );
  const latitude = getCoordinate(getFirstValue(searchParams.latitude), -90, 90);
  const longitude = getCoordinate(getFirstValue(searchParams.longitude), -180, 180);
  return {
    amenity: (getFirstValue(searchParams.amenity) ?? '').trim().slice(0, 80),
    ...(latitude !== undefined && longitude !== undefined
      ? { centerLatitude: latitude, centerLongitude: longitude }
      : {}),
    maximumNightlyRate: Math.min(
      getNonNegativeInteger(
        getFirstValue(searchParams.maximumNightlyRate),
        defaultHotelSearchFilters.maximumNightlyRate,
      ),
      10_000_000,
    ),
    minimumStarRating: Math.min(minimumStarRating, 5),
    page: getPositiveInteger(getFirstValue(searchParams.page), 1),
    refundableOnly: getFirstValue(searchParams.refundableOnly) === 'true',
    radiusKm: Math.min(getNonNegativeInteger(getFirstValue(searchParams.radiusKm), 0), 500),
    sort: getSearchSort(getFirstValue(searchParams.sort)),
  };
}

function getCoordinate(value: string | undefined, minimum: number, maximum: number) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
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
