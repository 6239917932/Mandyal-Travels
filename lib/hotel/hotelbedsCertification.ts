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

export type HotelbedsPaxType = 'AD' | 'CH';

export interface HotelbedsBookingPaxInput {
  age?: number;
  name: string;
  roomId: number;
  surname: string;
  type: HotelbedsPaxType;
}

export interface HotelbedsBookingInput {
  clientReference: string;
  holder: { name: string; surname: string };
  remark?: string;
  rooms: ReadonlyArray<{
    paxes: readonly HotelbedsBookingPaxInput[];
    rateKey: string;
  }>;
  tolerance?: number;
}

export interface HotelbedsBookingRequest {
  clientReference: string;
  holder: { name: string; surname: string };
  remark?: string;
  rooms: Array<{
    paxes: Array<{
      age?: number;
      name: string;
      roomId: number;
      surname: string;
      type: HotelbedsPaxType;
    }>;
    rateKey: string;
  }>;
  tolerance?: number;
}

export type HotelbedsCancellationFlag = 'SIMULATION' | 'CANCELLATION';

export type HotelbedsRateType = 'BOOKABLE' | 'RECHECK';

export interface HotelbedsRateReference {
  rateKey: string;
  rateType: HotelbedsRateType;
}

export interface HotelbedsPromotionDisclosure {
  code?: string;
  name: string;
}

export interface HotelbedsCancellationDisclosure {
  amount: string;
  from: string;
}

export interface HotelbedsRateDisclosure {
  boardCode?: string;
  boardName?: string;
  cancellationPolicies: HotelbedsCancellationDisclosure[];
  hotelCategory?: string;
  hotelCode?: number;
  hotelName?: string;
  packaging: boolean;
  promotions: HotelbedsPromotionDisclosure[];
  rateComments?: string;
  rateCommentsId?: string;
  rateKey: string;
  rateType: HotelbedsRateType;
  roomCode?: string;
  roomName?: string;
}

export interface HotelbedsRateDisclosureReadiness {
  missing: string[];
  readyForPreBookingDisplay: boolean;
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

function boundedText(value: unknown, maximum = 2_000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : undefined;
}

function requiredText(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error(`${label} must contain 1 to ${maximum} characters.`);
  }
  return normalized;
}

export function buildHotelbedsBookingRequest(
  input: HotelbedsBookingInput,
): HotelbedsBookingRequest {
  if (input.rooms.length === 0 || input.rooms.length > 9) {
    throw new Error('Hotelbeds booking must contain 1 to 9 rooms.');
  }
  const clientReference = requiredText(input.clientReference, 'Hotelbeds client reference', 100);
  const holder = {
    name: requiredText(input.holder.name, 'Hotelbeds holder name', 100),
    surname: requiredText(input.holder.surname, 'Hotelbeds holder surname', 100),
  };
  const rooms = input.rooms.map((room, roomIndex) => {
    const rateKey = requiredText(
      room.rateKey,
      `Hotelbeds room ${roomIndex + 1} rate key`,
      RATE_KEY_MAX_LENGTH,
    );
    if (room.paxes.length === 0 || room.paxes.length > 99) {
      throw new Error(`Hotelbeds room ${roomIndex + 1} must contain 1 to 99 passengers.`);
    }
    return {
      paxes: room.paxes.map((pax, paxIndex) => {
        requireInteger(
          pax.roomId,
          `Hotelbeds room ${roomIndex + 1} passenger ${paxIndex + 1} roomId`,
          1,
          9,
        );
        if (pax.type !== 'AD' && pax.type !== 'CH') {
          throw new Error('Hotelbeds passenger type must be AD or CH.');
        }
        if (pax.type === 'CH') {
          requireInteger(
            pax.age ?? Number.NaN,
            `Hotelbeds room ${roomIndex + 1} child ${paxIndex + 1} age`,
            0,
            17,
          );
        } else if (pax.age !== undefined) {
          throw new Error('Hotelbeds adult passengers must not include a child age.');
        }
        return {
          ...(pax.type === 'CH' ? { age: pax.age } : {}),
          name: requiredText(pax.name, 'Hotelbeds passenger name', 100),
          roomId: pax.roomId,
          surname: requiredText(pax.surname, 'Hotelbeds passenger surname', 100),
          type: pax.type,
        };
      }),
      rateKey,
    };
  });
  if (
    input.tolerance !== undefined &&
    (!Number.isFinite(input.tolerance) || input.tolerance < 0 || input.tolerance > 100)
  ) {
    throw new Error('Hotelbeds booking tolerance must be from 0 to 100.');
  }
  const remark =
    input.remark === undefined
      ? undefined
      : requiredText(input.remark, 'Hotelbeds booking remark', 2_000);
  return {
    clientReference,
    holder,
    ...(remark ? { remark } : {}),
    rooms,
    ...(input.tolerance !== undefined ? { tolerance: input.tolerance } : {}),
  };
}

export function hotelbedsBookingPath(reference: string): string {
  const normalized = requiredText(reference, 'Hotelbeds booking reference', 100);
  if (!/^[A-Za-z0-9-]+$/.test(normalized)) {
    throw new Error('Hotelbeds booking reference has an invalid format.');
  }
  return `/hotel-api/1.0/bookings/${encodeURIComponent(normalized)}`;
}

export function hotelbedsCancellationPath(
  reference: string,
  flag: HotelbedsCancellationFlag,
): string {
  if (flag !== 'SIMULATION' && flag !== 'CANCELLATION') {
    throw new Error('Hotelbeds cancellation flag is invalid.');
  }
  return `${hotelbedsBookingPath(reference)}?cancellationFlag=${flag}`;
}

function optionalHotelCode(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function extractPromotions(value: unknown): HotelbedsPromotionDisclosure[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((promotion) => {
    if (!isRecord(promotion)) return [];
    const name = boundedText(promotion.name, 500);
    if (!name) return [];
    const code = boundedText(promotion.code, 100);
    return [{ ...(code ? { code } : {}), name }];
  });
}

function extractCancellationPolicies(value: unknown): HotelbedsCancellationDisclosure[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((policy) => {
    if (!isRecord(policy)) return [];
    const amount = boundedText(policy.amount, 100);
    const from = boundedText(policy.from, 100);
    if (!amount || !/^\d+(?:\.\d+)?$/.test(amount) || !from || !Number.isFinite(Date.parse(from))) {
      return [];
    }
    return [{ amount, from }];
  });
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

export function extractHotelbedsRateDisclosures(payload: unknown): HotelbedsRateDisclosure[] {
  if (!isRecord(payload) || !isRecord(payload.hotels) || !Array.isArray(payload.hotels.hotels)) {
    return [];
  }
  const result: HotelbedsRateDisclosure[] = [];
  for (const hotel of payload.hotels.hotels) {
    if (!isRecord(hotel) || !Array.isArray(hotel.rooms)) continue;
    const hotelCode = optionalHotelCode(hotel.code);
    const hotelName = boundedText(hotel.name, 500);
    const hotelCategory =
      boundedText(hotel.categoryName, 200) ?? boundedText(hotel.categoryCode, 100);
    for (const room of hotel.rooms) {
      if (!isRecord(room) || !Array.isArray(room.rates)) continue;
      const roomCode = boundedText(room.code, 200);
      const roomName = boundedText(room.name, 500);
      for (const rate of room.rates) {
        if (!isRecord(rate)) continue;
        const rateKey = boundedText(rate.rateKey, RATE_KEY_MAX_LENGTH);
        const rateType = hotelbedsRateType(rate.rateType);
        if (!rateKey || !rateType) continue;
        const boardCode = boundedText(rate.boardCode, 100);
        const boardName = boundedText(rate.boardName, 500);
        const rateComments = boundedText(rate.rateComments, 5_000);
        const rateCommentsId = boundedText(rate.rateCommentsId, 500);
        result.push({
          ...(boardCode ? { boardCode } : {}),
          ...(boardName ? { boardName } : {}),
          cancellationPolicies: extractCancellationPolicies(rate.cancellationPolicies),
          ...(hotelCategory ? { hotelCategory } : {}),
          ...(hotelCode ? { hotelCode } : {}),
          ...(hotelName ? { hotelName } : {}),
          packaging: rate.packaging === true,
          promotions: extractPromotions(rate.promotions),
          ...(rateComments ? { rateComments } : {}),
          ...(rateCommentsId ? { rateCommentsId } : {}),
          rateKey,
          rateType,
          ...(roomCode ? { roomCode } : {}),
          ...(roomName ? { roomName } : {}),
        });
      }
    }
  }
  return result;
}

export function inspectHotelbedsRateDisclosure(
  rate: HotelbedsRateDisclosure,
): HotelbedsRateDisclosureReadiness {
  const missing: string[] = [];
  if (!rate.hotelName) missing.push('hotel name');
  if (!rate.roomName && !rate.roomCode) missing.push('room type');
  if (!rate.boardName && !rate.boardCode) missing.push('board type');
  if (rate.rateCommentsId && !rate.rateComments) missing.push('resolved rate comments');
  if (rate.packaging) missing.push('standalone-sale eligibility for opaque/package rate');
  return { missing, readyForPreBookingDisplay: missing.length === 0 };
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
