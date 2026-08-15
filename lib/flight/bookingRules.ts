const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{1,79}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10,15}$/;
const GENDERS = new Set(['female', 'male', 'other']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hasValidFlightPassengerDetails(details: unknown, expectedAdults: number): boolean {
  if (!isRecord(details) || !isRecord(details.passengerDraft)) return false;
  const contact = details.passengerDraft.contact;
  const passengers = details.passengerDraft.passengers;
  if (!isRecord(contact) || !Array.isArray(passengers) || passengers.length !== expectedAdults) {
    return false;
  }

  const email = typeof contact.email === 'string' ? contact.email.trim() : '';
  const phone = typeof contact.phone === 'string' ? contact.phone.replace(/\D/g, '') : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || !PHONE_PATTERN.test(phone)) return false;

  return passengers.every((passenger) => {
    if (!isRecord(passenger)) return false;
    const firstName = typeof passenger.firstName === 'string' ? passenger.firstName.trim() : '';
    const lastName = typeof passenger.lastName === 'string' ? passenger.lastName.trim() : '';
    const gender = typeof passenger.gender === 'string' ? passenger.gender : '';
    return NAME_PATTERN.test(firstName) && NAME_PATTERN.test(lastName) && GENDERS.has(gender);
  });
}
