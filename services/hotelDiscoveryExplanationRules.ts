export const HOTEL_DISCOVERY_EXPLANATION_STORAGE_KEY = 'mandyal-hotel-discovery-explanation';
export const HOTEL_DISCOVERY_EXPLANATION_MAX_LENGTH = 500;

const HOTEL_DISCOVERY_DESTINATION_MAX_LENGTH = 100;
const HOTEL_DISCOVERY_EXPLANATION_MAX_AGE_MS = 5 * 60 * 1000;
const HOTEL_DISCOVERY_EXPLANATION_FUTURE_TOLERANCE_MS = 30 * 1000;

type HotelDiscoveryExplanationPayload = {
  createdAt: number;
  destination: string;
  explanation: string;
  version: 1;
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeDestination(value: string): string | null {
  const normalized = normalizeText(value);
  return normalized.length <= HOTEL_DISCOVERY_DESTINATION_MAX_LENGTH ? normalized : null;
}

export function createHotelDiscoveryExplanationPayload({
  createdAt,
  destination,
  explanation,
}: Omit<HotelDiscoveryExplanationPayload, 'version'>): string | null {
  const normalizedDestination = normalizeDestination(destination);
  const normalizedExplanation = normalizeText(explanation);
  if (
    normalizedDestination === null ||
    normalizedExplanation.length === 0 ||
    normalizedExplanation.length > HOTEL_DISCOVERY_EXPLANATION_MAX_LENGTH ||
    !Number.isSafeInteger(createdAt) ||
    createdAt < 0
  ) {
    return null;
  }

  return JSON.stringify({
    createdAt,
    destination: normalizedDestination,
    explanation: normalizedExplanation,
    version: 1,
  } satisfies HotelDiscoveryExplanationPayload);
}

export function readHotelDiscoveryExplanationPayload(
  raw: string,
  expectedDestination: string,
  expectedCreatedAt: string,
  now: number,
): string | null {
  if (
    raw.length > 2_000 ||
    !/^\d{1,16}$/.test(expectedCreatedAt) ||
    !Number.isSafeInteger(now) ||
    now < 0
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== 1 ||
      typeof record.createdAt !== 'number' ||
      typeof record.destination !== 'string' ||
      typeof record.explanation !== 'string'
    ) {
      return null;
    }

    const destination = normalizeDestination(record.destination);
    const expected = normalizeDestination(expectedDestination);
    const explanation = normalizeText(record.explanation);
    const age = now - record.createdAt;
    if (
      destination === null ||
      expected === null ||
      String(record.createdAt) !== expectedCreatedAt ||
      destination.localeCompare(expected, undefined, { sensitivity: 'accent' }) !== 0 ||
      explanation.length === 0 ||
      explanation.length > HOTEL_DISCOVERY_EXPLANATION_MAX_LENGTH ||
      !Number.isSafeInteger(record.createdAt) ||
      age > HOTEL_DISCOVERY_EXPLANATION_MAX_AGE_MS ||
      age < -HOTEL_DISCOVERY_EXPLANATION_FUTURE_TOLERANCE_MS
    ) {
      return null;
    }

    return explanation;
  } catch {
    return null;
  }
}
