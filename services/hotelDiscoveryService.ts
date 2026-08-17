import { hotelService } from '@/services/hotelService';
import type { HotelDiscoverySuggestion, HotelSearchSort } from '@/types/hotel';

export interface HotelDiscoveryAdapter {
  interpret(intent: string): Promise<HotelDiscoverySuggestion>;
}

const AMENITY_TERMS = [
  { aliases: ['wifi', 'wi-fi'], value: 'Free high-speed Wi-Fi' },
  { aliases: ['parking'], value: 'Free on-site parking' },
  { aliases: ['restaurant', 'dining'], value: 'Restaurant' },
  { aliases: ['pool', 'swimming'], value: 'Swimming pool' },
  { aliases: ['spa', 'wellness'], value: 'Spa' },
] as const;

function findMaximumNightlyRate(intent: string): number {
  const match = intent.match(
    /(?:under|below|maximum|max|up to|budget(?: of)?)[\s:₹]*(?:rs\.?|inr)?\s*([0-9][0-9,]*)/i,
  );
  if (!match?.[1]) return 0;
  const amount = Number(match[1].replaceAll(',', ''));
  return Number.isSafeInteger(amount) && amount > 0 ? Math.min(amount, 10_000_000) : 0;
}

function findMinimumStarRating(intent: string): number {
  const match = intent.match(/([3-5])\s*(?:star|stars|\*)/i);
  return match?.[1] ? Number(match[1]) : 0;
}

function findSort(intent: string): HotelSearchSort {
  if (/best rated|top rated|highest rated|guest rating/i.test(intent)) return 'rating-descending';
  if (/premium|luxury|highest price/i.test(intent)) return 'price-descending';
  return 'price-ascending';
}

export class RuleBasedHotelDiscoveryAdapter implements HotelDiscoveryAdapter {
  async interpret(rawIntent: string): Promise<HotelDiscoverySuggestion> {
    const intent = rawIntent.trim().replace(/\s+/g, ' ').slice(0, 300);
    const normalizedIntent = intent.toLowerCase();
    const hotels = await hotelService.getHotels();
    const destinations = [
      ...new Set(
        hotels
          .flatMap((hotel) => [
            hotel.location.address.locality,
            hotel.location.address.city,
            hotel.location.address.tehsil,
            hotel.location.address.district,
            ...(hotel.propertyProfile?.locationAliases ?? []),
          ])
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort((left, right) => right.length - left.length);
    const destination =
      destinations.find((place) => normalizedIntent.includes(place.toLowerCase())) ?? '';
    const amenity =
      AMENITY_TERMS.find((candidate) =>
        candidate.aliases.some((alias) => normalizedIntent.includes(alias)),
      )?.value ?? '';
    const maximumNightlyRate = findMaximumNightlyRate(intent);
    const minimumStarRating = findMinimumStarRating(intent);
    const refundableOnly = /refundable|free cancellation|flexible cancellation/i.test(intent);
    const sort = findSort(intent);

    const recognized = [
      destination ? `destination ${destination}` : '',
      amenity ? `amenity ${amenity}` : '',
      maximumNightlyRate ? `nightly budget ₹${maximumNightlyRate.toLocaleString('en-IN')}` : '',
      minimumStarRating ? `${minimumStarRating}+ stars` : '',
      refundableOnly ? 'refundable rates' : '',
    ].filter(Boolean);
    return {
      explanation:
        recognized.length > 0
          ? `Applied ${recognized.join(', ')}. Live availability and final prices are checked by the normal hotel search.`
          : 'No specific filters were recognized, so all currently available stays are shown by lowest price.',
      filters: {
        amenity,
        maximumNightlyRate,
        minimumStarRating,
        radiusKm: 0,
        refundableOnly,
        sort,
      },
      normalizedDestination: destination,
    };
  }
}

export const hotelDiscoveryService: HotelDiscoveryAdapter = new RuleBasedHotelDiscoveryAdapter();
