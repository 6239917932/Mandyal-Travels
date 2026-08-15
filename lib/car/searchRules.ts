import type { CarOffer, CarSearchCriteria } from '../../types/car.ts';

const DAY_MS = 86_400_000;
const MAX_DRIVERS = 4;
const MAX_RENTAL_DAYS = 90;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function rentalDurationDays(
  pickupDate: string,
  dropoffDate: string,
  pickupTime = '00:00',
  dropoffTime = '00:00',
): number {
  return Math.ceil(
    (Date.parse(`${dropoffDate}T${dropoffTime}:00.000Z`) -
      Date.parse(`${pickupDate}T${pickupTime}:00.000Z`)) /
      DAY_MS,
  );
}

export function validateCarSearchCriteria(criteria: CarSearchCriteria, today: string): void {
  if (criteria.rentalMode !== 'self-drive' && criteria.rentalMode !== 'chauffeur') {
    throw new Error('Choose self-drive or chauffeur service.');
  }
  if (criteria.pickupLocation.length < 2 || criteria.pickupLocation.length > 100) {
    throw new Error('Enter a valid pickup location.');
  }
  if (criteria.dropoffLocation.length < 2 || criteria.dropoffLocation.length > 100) {
    throw new Error('Enter a valid drop-off location.');
  }
  if (
    !Number.isInteger(criteria.drivers) ||
    criteria.drivers < 1 ||
    criteria.drivers > MAX_DRIVERS
  ) {
    throw new Error(`Drivers must be between 1 and ${MAX_DRIVERS}.`);
  }
  if (criteria.pickupDate < today) throw new Error('Pickup date cannot be in the past.');
  if (!TIME_PATTERN.test(criteria.pickupTime) || !TIME_PATTERN.test(criteria.dropoffTime)) {
    throw new Error('Enter valid pickup and drop-off times.');
  }
  const days = rentalDurationDays(
    criteria.pickupDate,
    criteria.dropoffDate,
    criteria.pickupTime,
    criteria.dropoffTime,
  );
  if (days < 1) throw new Error('Drop-off date must be after pickup date.');
  if (days > MAX_RENTAL_DAYS)
    throw new Error(`Car rentals are limited to ${MAX_RENTAL_DAYS} days.`);
}

export function normalizeCarOffer(
  offer: CarOffer,
  criteria: CarSearchCriteria,
): CarOffer | undefined {
  const days = rentalDurationDays(
    criteria.pickupDate,
    criteria.dropoffDate,
    criteria.pickupTime,
    criteria.dropoffTime,
  );
  if (
    !offer.id.trim() ||
    !offer.providerName.trim() ||
    !offer.vehicleName.trim() ||
    !offer.source.trim() ||
    offer.pickupLocation.localeCompare(criteria.pickupLocation, undefined, {
      sensitivity: 'base',
    }) !== 0 ||
    offer.dropoffLocation.localeCompare(criteria.dropoffLocation, undefined, {
      sensitivity: 'base',
    }) !== 0 ||
    offer.rentalMode !== criteria.rentalMode ||
    offer.currency !== 'INR' ||
    !Number.isFinite(offer.pricePerDay) ||
    offer.pricePerDay <= 0 ||
    !Number.isInteger(offer.carsRemaining) ||
    offer.carsRemaining < 1 ||
    !Number.isInteger(offer.seats) ||
    offer.seats < 1 ||
    offer.seats > 20 ||
    !Number.isInteger(offer.bags) ||
    offer.bags < 0 ||
    offer.bags > 20
  ) {
    return undefined;
  }
  return {
    ...offer,
    features: [...new Set(offer.features.map((value) => value.trim()).filter(Boolean))].slice(
      0,
      30,
    ),
    totalPrice: offer.pricePerDay * days,
  };
}
