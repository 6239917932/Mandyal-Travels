export const HOTELBEDS_MAX_HOTELS_PER_AVAILABILITY = 2_000;
export const HOTELBEDS_MAX_RATES_PER_CHECKRATE = 10;
export const HOTELBEDS_BOOKING_TIMEOUT_MS = 65_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RATE_KEY_MAX_LENGTH = 2_048;

export interface HotelbedsOccupancyInput {
  adults: number;
  childAges?: readonly number[];
  rooms: number;
}

export interface HotelbedsAvailabilityInput {
  checkIn: string;
  checkOut: string;
  hotelCodes: readonly number[];
  occupancies: readonly HotelbedsOccupancyInput[];
  sourceMarket?: string;
}

export interface HotelbedsAvailabilityRequest {
  hotels: { hotel: number[] };
  occupancies: Array<{
    adults: number;
    children: number;
    paxes?: Array<{ age: number; type: 'CH' }>;
    rooms: number;
  }>;
  sourceMarket: string;
  stay: { checkIn: string; checkOut: string };
}

export interface HotelbedsCheckRateRequest {
  rooms: Array<{ rateKey: string }>;
}

export type HotelbedsRateType = 'BOOKABLE' | 'RECHECK';

export interface HotelbedsRateReference {
  rateKey: string;
  rateType: HotelbedsRateType;
}

export type HotelbedsCertificationStage =
  'awaiting_availability' | 'availability_complete' | 'checkrate_required' | 'booking_ready';

export interface HotelbedsCertificationState {
  availabilityCalls: number;
  checkRateCalls: number;
  selectedRate?: HotelbedsRateReference;
  stage: HotelbedsCertificationStage;
}

function requireInteger(value: number, label: string, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function dateValue(value: string, label: string): number {
  if (!DATE_PATTERN.test(value)) throw new Error(`${label} must use YYYY-MM-DD.`);
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid calendar date.`);
  }
  return timestamp;
}

function normalizeSourceMarket(value: string | undefined): string {
  const normalized = (value ?? 'IN').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error('Hotelbeds source market must be a two-letter country code.');
  }
  return normalized;
}

function uniqueHotelCodes(values: readonly number[]): number[] {
  if (values.length === 0) throw new Error('At least one Hotelbeds hotel code is required.');
  if (values.length > HOTELBEDS_MAX_HOTELS_PER_AVAILABILITY) {
    throw new Error(
      `Hotelbeds availability accepts at most ${HOTELBEDS_MAX_HOTELS_PER_AVAILABILITY} hotels.`,
    );
  }
  const result: number[] = [];
  const seen = new Set<number>();
  for (const value of values) {
    requireInteger(value, 'Hotelbeds hotel code', 1, Number.MAX_SAFE_INTEGER);
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export function buildHotelbedsAvailabilityRequest(
  input: HotelbedsAvailabilityInput,
): HotelbedsAvailabilityRequest {
  const checkIn = dateValue(input.checkIn, 'Hotelbeds check-in');
  const checkOut = dateValue(input.checkOut, 'Hotelbeds check-out');
  if (checkOut <= checkIn) throw new Error('Hotelbeds check-out must be after check-in.');
  if (input.occupancies.length === 0) {
    throw new Error('At least one Hotelbeds occupancy is required.');
  }

  const occupancies = input.occupancies.map((occupancy, index) => {
    requireInteger(occupancy.rooms, `Occupancy ${index + 1} rooms`, 1, 9);
    requireInteger(occupancy.adults, `Occupancy ${index + 1} adults`, 1, 99);
    const childAges = [...(occupancy.childAges ?? [])];
    childAges.forEach((age, childIndex) =>
      requireInteger(age, `Occupancy ${index + 1} child ${childIndex + 1} age`, 0, 17),
    );
    return {
      adults: occupancy.adults,
      children: childAges.length,
      ...(childAges.length > 0
        ? { paxes: childAges.map((age) => ({ age, type: 'CH' as const })) }
        : {}),
      rooms: occupancy.rooms,
    };
  });

  return {
    hotels: { hotel: uniqueHotelCodes(input.hotelCodes) },
    occupancies,
    sourceMarket: normalizeSourceMarket(input.sourceMarket),
    stay: { checkIn: input.checkIn, checkOut: input.checkOut },
  };
}

function normalizeRateKeys(rateKeys: readonly string[]): string[] {
  if (rateKeys.length === 0) throw new Error('At least one Hotelbeds rate key is required.');
  if (rateKeys.length > HOTELBEDS_MAX_RATES_PER_CHECKRATE) {
    throw new Error(
      `Hotelbeds CheckRate accepts at most ${HOTELBEDS_MAX_RATES_PER_CHECKRATE} rates.`,
    );
  }
  const result: string[] = [];
  const seen = new Set<string>();
  for (const rateKey of rateKeys) {
    const normalized = rateKey.trim();
    if (!normalized || normalized.length > RATE_KEY_MAX_LENGTH) {
      throw new Error('Hotelbeds rate keys must be non-empty and reasonably bounded.');
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export function buildHotelbedsCheckRateRequest(
  rateKeys: readonly string[],
): HotelbedsCheckRateRequest {
  return { rooms: normalizeRateKeys(rateKeys).map((rateKey) => ({ rateKey })) };
}

export function hotelbedsRateType(value: unknown): HotelbedsRateType | undefined {
  return value === 'BOOKABLE' || value === 'RECHECK' ? value : undefined;
}

export function shouldRequestHotelbedsCheckRate(rateType: HotelbedsRateType): boolean {
  return rateType === 'RECHECK';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extractHotelbedsRates(payload: unknown): HotelbedsRateReference[] {
  if (!isRecord(payload) || !isRecord(payload.hotels) || !Array.isArray(payload.hotels.hotels)) {
    return [];
  }
  const result: HotelbedsRateReference[] = [];
  for (const hotel of payload.hotels.hotels) {
    if (!isRecord(hotel) || !Array.isArray(hotel.rooms)) continue;
    for (const room of hotel.rooms) {
      if (!isRecord(room) || !Array.isArray(room.rates)) continue;
      for (const rate of room.rates) {
        if (!isRecord(rate) || typeof rate.rateKey !== 'string') continue;
        const rateType = hotelbedsRateType(rate.rateType);
        if (rateType) result.push({ rateKey: rate.rateKey, rateType });
      }
    }
  }
  return result;
}

export function createHotelbedsCertificationState(): HotelbedsCertificationState {
  return { availabilityCalls: 0, checkRateCalls: 0, stage: 'awaiting_availability' };
}

export function recordHotelbedsAvailability(
  state: HotelbedsCertificationState,
): HotelbedsCertificationState {
  if (state.stage !== 'awaiting_availability' || state.availabilityCalls !== 0) {
    throw new Error('Hotelbeds availability must not be repeated within one booking workflow.');
  }
  return { ...state, availabilityCalls: 1, stage: 'availability_complete' };
}

export function selectHotelbedsRate(
  state: HotelbedsCertificationState,
  selectedRate: HotelbedsRateReference,
): HotelbedsCertificationState {
  if (state.stage !== 'availability_complete') {
    throw new Error('A Hotelbeds rate may only be selected after availability.');
  }
  return {
    ...state,
    selectedRate,
    stage: shouldRequestHotelbedsCheckRate(selectedRate.rateType)
      ? 'checkrate_required'
      : 'booking_ready',
  };
}

export function recordHotelbedsCheckRate(
  state: HotelbedsCertificationState,
): HotelbedsCertificationState {
  if (state.stage !== 'checkrate_required' || state.checkRateCalls !== 0) {
    throw new Error('Hotelbeds CheckRate is allowed exactly once and only for a RECHECK rate.');
  }
  return { ...state, checkRateCalls: 1, stage: 'booking_ready' };
}

export function assertHotelbedsBookingReady(state: HotelbedsCertificationState): void {
  if (state.stage !== 'booking_ready' || state.availabilityCalls !== 1 || !state.selectedRate) {
    throw new Error('Hotelbeds booking is not ready for confirmation.');
  }
  if (state.selectedRate.rateType === 'RECHECK' && state.checkRateCalls !== 1) {
    throw new Error('Hotelbeds RECHECK rate must complete CheckRate before booking.');
  }
}
