const EARTH_RADIUS_KILOMETRES = 6371;

export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceInKilometres(
  first: GeographicCoordinate,
  second: GeographicCoordinate,
): number {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KILOMETRES * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
