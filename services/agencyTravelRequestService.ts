import { BUSINESS_TRAVEL_PRODUCTS } from './businessTravelRequestService.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const AGENCY_REQUEST_IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AgencyTravelRequestInput = {
  agencyCustomerId: string;
  endDate: string | null;
  estimatedAmount: number;
  productType: string;
  startDate: string;
  title: string;
};

type PersistedAgencyTravelRequestIdentity = Omit<AgencyTravelRequestInput, 'agencyCustomerId'> & {
  agencyCustomerId: string | null;
  organizationId: string;
  requesterId: string;
};

export function matchesAgencyTravelRequest(
  existing: PersistedAgencyTravelRequestIdentity,
  requested: AgencyTravelRequestInput,
  context: { organizationId: string; requesterId: string },
) {
  return (
    existing.organizationId === context.organizationId &&
    existing.requesterId === context.requesterId &&
    existing.agencyCustomerId === requested.agencyCustomerId &&
    existing.productType === requested.productType &&
    existing.title === requested.title &&
    existing.startDate === requested.startDate &&
    existing.endDate === requested.endDate &&
    existing.estimatedAmount === requested.estimatedAmount
  );
}

type AgencyTravelRequestInputResult =
  { error: string; ok: false } | { ok: true; value: AgencyTravelRequestInput };

function readText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length <= maximumLength ? text : '';
}

function isValidIsoDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseAgencyTravelRequestInput(
  body: Record<string, unknown>,
  today = new Date().toISOString().slice(0, 10),
): AgencyTravelRequestInputResult {
  const agencyCustomerId = readText(body.agencyCustomerId, 100);
  const productType = readText(body.productType, 20).toUpperCase();
  const title = readText(body.title, 160);
  const startDate = readText(body.startDate, 10);
  const endDate = body.endDate == null || body.endDate === '' ? null : readText(body.endDate, 10);
  const estimatedAmount = body.estimatedAmount;

  if (!agencyCustomerId) return { error: 'Select an active agency customer.', ok: false };
  if (!BUSINESS_TRAVEL_PRODUCTS.has(productType)) {
    return { error: 'Select a valid travel product.', ok: false };
  }
  if (!title) return { error: 'Enter a short trip purpose or destination.', ok: false };
  if (!isValidIsoDate(startDate) || startDate < today) {
    return { error: 'Enter a valid future travel date.', ok: false };
  }
  if (endDate !== null && (!isValidIsoDate(endDate) || endDate < startDate)) {
    return { error: 'The end date must be on or after the start date.', ok: false };
  }
  if ((productType === 'HOTEL' || productType === 'CAR') && endDate === null) {
    return { error: 'Enter the approved end date for hotel and car travel.', ok: false };
  }
  if (productType === 'BUS' && endDate !== null) {
    return { error: 'Bus requests use one travel date. Leave the end date blank.', ok: false };
  }
  if (
    typeof estimatedAmount !== 'number' ||
    !Number.isInteger(estimatedAmount) ||
    estimatedAmount < 1 ||
    estimatedAmount > 10_000_000
  ) {
    return { error: 'Estimated amount must be between INR 1 and INR 1,00,00,000.', ok: false };
  }

  return {
    ok: true,
    value: { agencyCustomerId, endDate, estimatedAmount, productType, startDate, title },
  };
}
