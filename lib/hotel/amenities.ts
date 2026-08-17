const amenityAliases = new Map<string, string>([
  ['free high speed wi fi', 'Free high-speed Wi-Fi'],
  ['free parking', 'Free on-site parking'],
  ['free wi fi', 'Free high-speed Wi-Fi'],
  ['high speed wi fi', 'Free high-speed Wi-Fi'],
  ['wi fi', 'Free high-speed Wi-Fi'],
  ['wifi', 'Free high-speed Wi-Fi'],
  ['on site parking', 'Free on-site parking'],
  ['parking', 'Free on-site parking'],
  ['geyser', 'Geyser / water heater'],
  ['geyser water heater', 'Geyser / water heater'],
  ['gyser', 'Geyser / water heater'],
  ['water heater', 'Geyser / water heater'],
  ['pool', 'Swimming pool'],
  ['sweeming pool', 'Swimming pool'],
  ['swimming', 'Swimming pool'],
  ['swimming pool', 'Swimming pool'],
]);

function amenityLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHotelAmenityName(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return amenityAliases.get(amenityLookupKey(cleaned)) ?? cleaned;
}

export function normalizeHotelAmenityList(values: readonly string[]): string[] {
  return [
    ...new Set(values.map(normalizeHotelAmenityName).filter((amenity) => amenity.length > 0)),
  ];
}

export function hotelAmenityMatches(amenity: string, filter: string): boolean {
  const normalizedAmenity = normalizeHotelAmenityName(amenity).toLowerCase();
  const normalizedFilter = normalizeHotelAmenityName(filter).toLowerCase();

  return (
    normalizedFilter.length === 0 ||
    normalizedAmenity === normalizedFilter ||
    normalizedAmenity.includes(normalizedFilter)
  );
}
