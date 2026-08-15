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
  if (typeof value !== 'string' || !Number.isInteger(passengers) || passengers < 1)
    return undefined;
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

export function seatsFitBusCapacity(seats: string[], seatCapacity: number): boolean {
  if (!Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 80) return false;
  return seats.every((seat) => {
    const match = /^(\d{1,2})([A-D])$/.exec(seat.toUpperCase());
    if (!match) return false;
    const row = Number(match[1]);
    const column = match[2].charCodeAt(0) - 64;
    return (row - 1) * 4 + column <= seatCapacity;
  });
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
