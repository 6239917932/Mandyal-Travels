import type { BusOffer, BusResultControls } from '@/types/bus';

export type BusResultControlCatalogue = Readonly<{
  busTypes: readonly string[];
  operators: readonly string[];
}>;

const MAXIMUM_TOTAL_PRICE = 10_000_000;
const MAXIMUM_CATALOGUE_VALUE_LENGTH = 100;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const POSITIVE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const safeCatalogueEntry = (value: string) => {
  const normalized = value.trim();
  return normalized === value &&
    value.length > 0 &&
    value.length <= MAXIMUM_CATALOGUE_VALUE_LENGTH &&
    !CONTROL_CHARACTERS.test(value)
    ? value
    : undefined;
};

const catalogueValue = (value: string | undefined, allowed: readonly string[]) => {
  if (!value) return undefined;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAXIMUM_CATALOGUE_VALUE_LENGTH ||
    CONTROL_CHARACTERS.test(normalized)
  ) {
    return undefined;
  }
  return allowed.includes(normalized) ? normalized : undefined;
};

const boundedPrice = (value: string | undefined) => {
  if (!value || !POSITIVE_DECIMAL.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 && parsed <= MAXIMUM_TOTAL_PRICE ? parsed : undefined;
};

const catalogueValues = (values: readonly string[]) =>
  [...new Set(values.map(safeCatalogueEntry).filter((value) => value !== undefined))].toSorted();

export function createBusResultControlCatalogue(
  offers: readonly BusOffer[],
): BusResultControlCatalogue {
  return {
    busTypes: catalogueValues(offers.map((offer) => offer.busType)),
    operators: catalogueValues(offers.map((offer) => offer.operatorName)),
  };
}

export function createBusResultControls(
  params: Record<string, string | string[] | undefined>,
  catalogue: BusResultControlCatalogue,
): BusResultControls {
  const sort = first(params.sort);
  return {
    busType: catalogueValue(first(params.busType), catalogue.busTypes),
    maximumTotalPrice: boundedPrice(first(params.maximumTotalPrice)),
    operator: catalogueValue(first(params.operator), catalogue.operators),
    refundableOnly: first(params.refundableOnly) === 'true',
    sort:
      sort === 'duration-ascending' ||
      sort === 'departure-ascending' ||
      sort === 'rating-descending'
        ? sort
        : 'price-ascending',
  };
}
