import type { HotelSearchResult } from '@/types/hotel';

export interface HotelResultsLocationMarker {
  hotelId: string;
  label: string;
  latitude: number;
  longitude: number;
  xPercent: number;
  yPercent: number;
}

const PLOT_PADDING_PERCENT = 10;
const PLOT_SPAN_PERCENT = 100 - PLOT_PADDING_PERCENT * 2;

function isUsableCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function scaleCoordinate(value: number, minimum: number, maximum: number): number {
  if (minimum === maximum) return 50;

  return PLOT_PADDING_PERCENT + ((value - minimum) / (maximum - minimum)) * PLOT_SPAN_PERCENT;
}

export function createHotelResultsLocationMarkers(
  results: HotelSearchResult[],
): HotelResultsLocationMarker[] {
  const usableResults = results.filter(({ hotel }) =>
    isUsableCoordinate(hotel.location.latitude, hotel.location.longitude),
  );

  if (usableResults.length === 0) return [];

  const latitudes = usableResults.map(({ hotel }) => hotel.location.latitude);
  const longitudes = usableResults.map(({ hotel }) => hotel.location.longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);

  return usableResults.map(({ hotel }) => ({
    hotelId: hotel.id,
    label: hotel.name,
    latitude: hotel.location.latitude,
    longitude: hotel.location.longitude,
    xPercent: scaleCoordinate(hotel.location.longitude, minimumLongitude, maximumLongitude),
    yPercent: 100 - scaleCoordinate(hotel.location.latitude, minimumLatitude, maximumLatitude),
  }));
}
