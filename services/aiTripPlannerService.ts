import type { TripPlannerInput, TripPlannerResult } from '@/types/ai';

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AIRPORT = /^[A-Z]{3}$/;

function isIsoDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function clean(value: string, maximum: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function query(path: string, values: Record<string, string | number>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => params.set(key, String(value)));
  return `${path}?${params.toString()}`;
}

export class RuleBasedTripPlannerService {
  plan(raw: TripPlannerInput, today: string): TripPlannerResult {
    const destination = clean(raw.destination, 100);
    const origin = clean(raw.origin, 100);
    if (destination.length < 2 || origin.length < 2)
      throw new Error('Enter an origin and destination of at least 2 characters.');
    if (!isIsoDate(raw.checkInDate) || !isIsoDate(raw.checkOutDate) || raw.checkInDate < today)
      throw new Error('Choose valid current or future travel dates.');
    const start = Date.parse(`${raw.checkInDate}T00:00:00Z`);
    const end = Date.parse(`${raw.checkOutDate}T00:00:00Z`);
    const nights = Math.round((end - start) / DAY_MS);
    if (!Number.isInteger(nights) || nights < 1 || nights > 30)
      throw new Error('Choose a trip between 1 and 30 nights.');
    if (!Number.isInteger(raw.adults) || raw.adults < 1 || raw.adults > 9)
      throw new Error('Choose between 1 and 9 adult travellers.');
    const interests = [
      ...new Set(raw.interests.map((value) => clean(value, 40)).filter(Boolean)),
    ].slice(0, 5);
    const links: TripPlannerResult['links'] = [
      {
        href: query('/hotels', {
          adults: raw.adults,
          checkInDate: raw.checkInDate,
          checkOutDate: raw.checkOutDate,
          children: 0,
          destination,
          rooms: 1,
        }),
        label: `Check live stays in ${destination}`,
        product: 'HOTEL',
      },
      {
        href: query('/buses', {
          destination,
          origin,
          passengers: Math.min(raw.adults, 6),
          travelDate: raw.checkInDate,
        }),
        label: `Check bus services from ${origin}`,
        product: 'BUS',
      },
      {
        href: query('/cars', {
          drivers: 1,
          dropoffDate: raw.checkOutDate,
          dropoffLocation: destination,
          dropoffTime: '10:00',
          pickupDate: raw.checkInDate,
          pickupLocation: destination,
          pickupTime: '10:00',
          rentalMode: 'self-drive',
        }),
        label: `Check local car rentals in ${destination}`,
        product: 'CAR',
      },
    ];
    const originAirport = clean(raw.originAirport ?? '', 3).toUpperCase();
    const destinationAirport = clean(raw.destinationAirport ?? '', 3).toUpperCase();
    if (
      AIRPORT.test(originAirport) &&
      AIRPORT.test(destinationAirport) &&
      originAirport !== destinationAirport
    ) {
      links.unshift({
        href: query('/flights', {
          adults: raw.adults,
          cabinClass: 'economy',
          departureDate: raw.checkInDate,
          destination: destinationAirport,
          origin: originAirport,
          returnDate: raw.checkOutDate,
          tripType: 'return',
        }),
        label: `Check return flights ${originAirport}–${destinationAirport}`,
        product: 'FLIGHT',
      });
    }
    const days = Array.from({ length: Math.min(nights + 1, 8) }, (_, index) => {
      const date = new Date(start + index * DAY_MS).toISOString().slice(0, 10);
      if (index === 0)
        return {
          date,
          day: 1,
          guidance: 'Keep time for arrival, check-in, and a flexible nearby activity.',
          title: `Arrive in ${destination}`,
        };
      if (index === nights)
        return {
          date,
          day: index + 1,
          guidance: 'Confirm checkout and transport timing before departure.',
          title: `Depart ${destination}`,
        };
      const interest = interests[(index - 1) % Math.max(1, interests.length)];
      return {
        date,
        day: index + 1,
        guidance: interest
          ? `Explore ${interest.toLowerCase()} options after checking opening hours and local conditions.`
          : 'Choose a locally suitable activity and keep the schedule editable.',
        title: interest ? `${interest} day` : 'Flexible exploration day',
      };
    });
    return {
      days,
      disclosure:
        'This is an explainable planning suggestion, not a booking or availability promise. Open each product search to verify live inventory, policies, and final prices before selection.',
      links,
      summary: `${nights}-night editable plan from ${origin} to ${destination} for ${raw.adults} adult${raw.adults === 1 ? '' : 's'}${interests.length ? `, prioritizing ${interests.join(', ')}` : ''}.`,
    };
  }
}

export const aiTripPlannerService = new RuleBasedTripPlannerService();
