import type {
  CarOffer,
  CarResultControlCatalogue,
  CarResultControls,
  CarSearchCriteria,
} from '@/types/car';

const MAX_TOTAL_PRICE = 10_000_000;
const MAX_SEATS = 20;
const CONTROL_TEXT_LIMIT = 100;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const POSITIVE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const catalogueValue = (value: string | undefined, allowed: readonly string[]) => {
  const normalized = value?.trim();
  if (
    !normalized ||
    normalized.length > CONTROL_TEXT_LIMIT ||
    CONTROL_CHARACTERS.test(normalized)
  ) {
    return undefined;
  }
  return allowed.includes(normalized) ? normalized : undefined;
};

const boundedPrice = (value: string | undefined) => {
  if (!value || !POSITIVE_DECIMAL.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 && parsed <= MAX_TOTAL_PRICE ? parsed : undefined;
};

const boundedSeats = (value: string | undefined) => {
  if (!value || !POSITIVE_INTEGER.test(value)) return undefined;
  const parsed = Number(value);
  return parsed <= MAX_SEATS ? parsed : undefined;
};

export const defaultCarResultControls: CarResultControls = {
  sort: 'price-ascending',
};

export function carSearchCriteriaToQuery(criteria: CarSearchCriteria): Record<string, string> {
  return {
    drivers: String(criteria.drivers),
    dropoffDate: criteria.dropoffDate,
    dropoffLocation: criteria.dropoffLocation,
    dropoffTime: criteria.dropoffTime,
    pickupDate: criteria.pickupDate,
    pickupLocation: criteria.pickupLocation,
    pickupTime: criteria.pickupTime,
    rentalMode: criteria.rentalMode,
  };
}

export function createCarResultControls(
  params: Record<string, string | string[] | undefined>,
  catalogue: CarResultControlCatalogue,
): CarResultControls {
  const sort = first(params.sort);
  const transmission = first(params.transmission);

  return {
    category: catalogueValue(first(params.category), catalogue.categories),
    maximumTotalPrice: boundedPrice(first(params.maximumTotalPrice)),
    minimumSeats: boundedSeats(first(params.minimumSeats)),
    provider: catalogueValue(first(params.provider), catalogue.providers),
    sort: sort === 'vehicle-name-ascending' ? sort : defaultCarResultControls.sort,
    transmission:
      transmission === 'Automatic' || transmission === 'Manual' ? transmission : undefined,
  };
}

const compareText = (firstValue: string, secondValue: string) => {
  const firstNormalized = firstValue.toLocaleLowerCase('en-IN');
  const secondNormalized = secondValue.toLocaleLowerCase('en-IN');
  if (firstNormalized < secondNormalized) return -1;
  if (firstNormalized > secondNormalized) return 1;
  if (firstValue < secondValue) return -1;
  if (firstValue > secondValue) return 1;
  return 0;
};

const compareIdentity = (firstOffer: CarOffer, secondOffer: CarOffer) =>
  compareText(firstOffer.vehicleName, secondOffer.vehicleName) ||
  compareText(firstOffer.providerName, secondOffer.providerName) ||
  compareText(firstOffer.category, secondOffer.category) ||
  compareText(firstOffer.id, secondOffer.id);

export function applyCarResultControls(
  offers: readonly CarOffer[],
  controls: CarResultControls,
): CarOffer[] {
  const filtered = offers.filter(
    (offer) =>
      (!controls.category || offer.category === controls.category) &&
      (!controls.provider || offer.providerName === controls.provider) &&
      (!controls.transmission || offer.transmission === controls.transmission) &&
      (controls.minimumSeats === undefined || offer.seats >= controls.minimumSeats) &&
      (controls.maximumTotalPrice === undefined || offer.totalPrice <= controls.maximumTotalPrice),
  );

  return filtered.toSorted((firstOffer, secondOffer) => {
    if (controls.sort === 'vehicle-name-ascending') {
      return (
        compareIdentity(firstOffer, secondOffer) || firstOffer.totalPrice - secondOffer.totalPrice
      );
    }
    return (
      firstOffer.totalPrice - secondOffer.totalPrice || compareIdentity(firstOffer, secondOffer)
    );
  });
}
