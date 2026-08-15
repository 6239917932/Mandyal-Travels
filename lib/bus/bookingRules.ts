const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = new Set(['female', 'male', 'other']);
const SEAT_PATTERN = /^(?:[1-9]|[1-9]\d)[A-D]$/;

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function validName(value: unknown): boolean {
  return typeof value === 'string' && PERSON_NAME_PATTERN.test(value.trim());
}

export function parseBusSeats(value: unknown, passengers: number): string[] | undefined {
  if (typeof value !== 'string' || !Number.isInteger(passengers) || passengers < 1) return undefined;
  const seats = value
    .split(',')
    .map((seat) => seat.trim().toUpperCase())
    .filter(Boolean);
  if (
    seats.length !== passengers ||
    new Set(seats).size !== seats.length ||
    seats.some((seat) => !SEAT_PATTERN.test(seat))
  ) {
    return undefined;
  }
  return seats;
}

export function hasValidBusPassengerDetails(details: unknown, passengers: number): boolean {
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) return false;
  const detailRecord = readRecord(details);
  const draft = detailRecord ? readRecord(detailRecord.passengerDraft) : undefined;
  if (!draft || !Array.isArray(draft.travelers) || draft.travelers.length !== passengers) {
    return false;
  }

  const contact = readRecord(draft.contact);
  const email = contact?.email;
  const phone = typeof contact?.phone === 'string' ? contact.phone.replace(/\D/g, '') : '';
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email.trim()) ||
    phone.length < 10 ||
    phone.length > 15
  ) {
    return false;
  }

  return draft.travelers.every((value) => {
    const traveler = readRecord(value);
    return Boolean(
      traveler &&
        validName(traveler.firstName) &&
        validName(traveler.lastName) &&
        Number.isInteger(traveler.age) &&
        (traveler.age as number) >= 1 &&
        (traveler.age as number) <= 120 &&
        typeof traveler.gender === 'string' &&
        GENDERS.has(traveler.gender),
    );
  });
}
