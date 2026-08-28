import type { FlightOffer, FlightSearchCriteria, FlightSegment } from '../../types/flight.ts';

export type AmadeusEnvironment = 'test' | 'production';

export interface AmadeusFlightConfiguration {
  clientId: string;
  clientSecret: string;
  environment: AmadeusEnvironment;
}

interface AmadeusSegment {
  arrival?: { at?: unknown; iataCode?: unknown };
  carrierCode?: unknown;
  departure?: { at?: unknown; iataCode?: unknown };
  duration?: unknown;
  number?: unknown;
  numberOfStops?: unknown;
}

interface AmadeusFareDetail {
  brandedFareLabel?: unknown;
  cabin?: unknown;
  includedCheckedBags?: { quantity?: unknown; weight?: unknown; weightUnit?: unknown };
}

interface AmadeusOffer {
  id?: unknown;
  itineraries?: Array<{ segments?: AmadeusSegment[] }>;
  numberOfBookableSeats?: unknown;
  price?: { currency?: unknown; grandTotal?: unknown };
  travelerPricings?: Array<{ fareDetailsBySegment?: AmadeusFareDetail[] }>;
}

export interface AmadeusFlightResponse {
  data?: AmadeusOffer[];
  dictionaries?: { carriers?: Record<string, unknown> };
}

const PLACEHOLDER_PATTERN = /^(?:replace|example|your[-_]|test[-_]?key)/i;

function readConfiguredSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && !PLACEHOLDER_PATTERN.test(normalized) ? normalized : undefined;
}

export function readAmadeusFlightConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): AmadeusFlightConfiguration | undefined {
  if (environment.AMADEUS_FLIGHT_ENABLED !== 'true') return undefined;

  const clientId = readConfiguredSecret(environment.AMADEUS_CLIENT_ID);
  const clientSecret = readConfiguredSecret(environment.AMADEUS_CLIENT_SECRET);
  const providerEnvironment = environment.AMADEUS_ENVIRONMENT;
  if (!clientId || !clientSecret) {
    throw new Error('Amadeus flight search is enabled without complete server credentials.');
  }
  if (providerEnvironment !== 'test' && providerEnvironment !== 'production') {
    throw new Error('AMADEUS_ENVIRONMENT must be test or production.');
  }
  if (environment.NODE_ENV === 'production' && providerEnvironment !== 'production') {
    throw new Error('Amadeus test inventory cannot be enabled in production.');
  }
  return { clientId, clientSecret, environment: providerEnvironment };
}

export function amadeusApiOrigin(environment: AmadeusEnvironment): string {
  return environment === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
}

export function buildAmadeusFlightSearchUrl(
  origin: string,
  criteria: FlightSearchCriteria,
): URL | undefined {
  if (criteria.tripType === 'multi-city') return undefined;
  const url = new URL('/v2/shopping/flight-offers', origin);
  url.searchParams.set('originLocationCode', criteria.origin);
  url.searchParams.set('destinationLocationCode', criteria.destination);
  url.searchParams.set('departureDate', criteria.departureDate);
  if (criteria.tripType === 'return' && criteria.returnDate) {
    url.searchParams.set('returnDate', criteria.returnDate);
  }
  url.searchParams.set('adults', String(criteria.adults));
  url.searchParams.set(
    'travelClass',
    criteria.cabinClass === 'premium-economy'
      ? 'PREMIUM_ECONOMY'
      : criteria.cabinClass.toUpperCase(),
  );
  url.searchParams.set('currencyCode', 'INR');
  url.searchParams.set('max', '20');
  return url;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseDurationMinutes(value: unknown): number | undefined {
  const duration = readString(value);
  if (!duration) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const total = hours * 60 + minutes;
  return Number.isInteger(total) && total > 0 ? total : undefined;
}

function parsePositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function baggageLabel(detail: AmadeusFareDetail | undefined): string {
  const bags = detail?.includedCheckedBags;
  const quantity = parsePositiveInteger(bags?.quantity);
  if (quantity) return `${quantity} checked bag${quantity === 1 ? '' : 's'} included`;
  const weight = parsePositiveInteger(bags?.weight);
  const unit = readString(bags?.weightUnit);
  if (weight && unit) return `${weight} ${unit.toLowerCase()} checked baggage included`;
  return 'Baggage allowance confirmed during fare review';
}

function mapSegment(
  value: AmadeusSegment,
  leg: FlightSegment['leg'],
  carriers: Record<string, unknown>,
): FlightSegment | undefined {
  const airlineCode = readString(value.carrierCode);
  const flightNumber = readString(value.number);
  const departureAirport = readString(value.departure?.iataCode);
  const departureAt = readString(value.departure?.at);
  const arrivalAirport = readString(value.arrival?.iataCode);
  const arrivalAt = readString(value.arrival?.at);
  const durationMinutes = parseDurationMinutes(value.duration);
  if (
    !airlineCode ||
    !flightNumber ||
    !departureAirport ||
    !departureAt ||
    !arrivalAirport ||
    !arrivalAt ||
    !durationMinutes
  ) {
    return undefined;
  }
  const stops =
    typeof value.numberOfStops === 'number' &&
    Number.isInteger(value.numberOfStops) &&
    value.numberOfStops >= 0
      ? value.numberOfStops
      : 0;
  return {
    airlineCode,
    airlineName: readString(carriers[airlineCode]) ?? airlineCode,
    arrivalAirport,
    arrivalAt,
    departureAirport,
    departureAt,
    durationMinutes,
    flightNumber: `${airlineCode} ${flightNumber}`,
    leg,
    stops,
  };
}

export function mapAmadeusFlightOffers(
  response: AmadeusFlightResponse,
  criteria: FlightSearchCriteria,
  environment: AmadeusEnvironment,
): FlightOffer[] {
  const carriers = response.dictionaries?.carriers ?? {};
  return (response.data ?? []).flatMap((value): FlightOffer[] => {
    const id = readString(value.id);
    const total = Number(value.price?.grandTotal);
    const currency = readString(value.price?.currency);
    const seatsRemaining = parsePositiveInteger(value.numberOfBookableSeats);
    const itineraries = value.itineraries ?? [];
    if (
      !id ||
      !Number.isFinite(total) ||
      total <= 0 ||
      currency !== 'INR' ||
      !seatsRemaining ||
      itineraries.length < 1 ||
      itineraries.length > 2
    ) {
      return [];
    }
    const segments = itineraries.flatMap((itinerary, itineraryIndex) => {
      const leg: FlightSegment['leg'] = itineraryIndex === 0 ? 'outbound' : 'return';
      return (itinerary.segments ?? []).map((segment) => mapSegment(segment, leg, carriers));
    });
    if (segments.length === 0 || segments.some((segment) => segment === undefined)) return [];
    const firstFareDetail = value.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
    const fareFamily = readString(firstFareDetail?.brandedFareLabel) ?? 'Published Amadeus fare';
    return [
      {
        baggage: baggageLabel(firstFareDetail),
        cabinClass: criteria.cabinClass,
        currency: 'INR',
        fareFamily,
        id: `amadeus-${id}`,
        pricePerAdult: Math.round((total / criteria.adults) * 100) / 100,
        refundable: false,
        refundabilityStatus: 'requires-confirmation',
        seatsRemaining,
        segments: segments as FlightSegment[],
        supplier:
          environment === 'production'
            ? 'Amadeus Self-Service'
            : 'Amadeus test inventory — not bookable',
        totalPrice: total,
      },
    ];
  });
}
