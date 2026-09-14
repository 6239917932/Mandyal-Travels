import type { HotelBookingAddonOption, HotelBookingAddonPricingMode } from '@/types/commerce';

export const HOTEL_BOOKING_ADDON_CATEGORIES = [
  'MEAL',
  'EXTRA_BED',
  'TRANSFER',
  'EXPERIENCE',
  'WELLNESS',
  'OTHER',
] as const;

export const HOTEL_BOOKING_ADDON_PRICING_MODES = [
  'PER_BOOKING',
  'PER_NIGHT',
  'PER_ROOM',
  'PER_ROOM_PER_NIGHT',
  'PER_GUEST',
  'PER_GUEST_PER_NIGHT',
] as const satisfies readonly HotelBookingAddonPricingMode[];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function integer(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

export function normalizeHotelBookingAddon(values: Record<string, unknown>) {
  const name = text(values.name, 100);
  const description = text(values.description, 400);
  const category = text(values.category, 30).toUpperCase();
  const pricingMode = text(values.pricingMode, 40).toUpperCase();
  const unitAmount = integer(values.unitAmount);
  const taxRateBps = integer(values.taxRateBps);
  const minQuantity = integer(values.minQuantity);
  const maxQuantity = integer(values.maxQuantity);
  const startsOn = text(values.startsOn, 10);
  const endsOn = text(values.endsOn, 10);
  if (
    name.length < 2 ||
    !HOTEL_BOOKING_ADDON_CATEGORIES.includes(
      category as (typeof HOTEL_BOOKING_ADDON_CATEGORIES)[number],
    ) ||
    !HOTEL_BOOKING_ADDON_PRICING_MODES.includes(pricingMode as HotelBookingAddonPricingMode) ||
    unitAmount < 1 ||
    unitAmount > 1_000_000 ||
    taxRateBps < 0 ||
    taxRateBps > 10_000 ||
    minQuantity < 1 ||
    maxQuantity < minQuantity ||
    maxQuantity > 100 ||
    (startsOn && !DATE.test(startsOn)) ||
    (endsOn && !DATE.test(endsOn)) ||
    (startsOn && endsOn && startsOn > endsOn)
  )
    return undefined;
  return {
    category,
    currency: 'INR',
    description,
    endsOn,
    maxQuantity,
    minQuantity,
    name,
    pricingMode,
    startsOn,
    taxRateBps,
    unitAmount,
  };
}

export function bookingAddonMultiplier(input: {
  adults: number;
  children: number;
  nights: number;
  pricingMode: HotelBookingAddonPricingMode;
  quantity: number;
  rooms: number;
}) {
  const guests = input.adults + input.children;
  const base =
    input.pricingMode === 'PER_NIGHT'
      ? input.nights
      : input.pricingMode === 'PER_ROOM'
        ? input.rooms
        : input.pricingMode === 'PER_ROOM_PER_NIGHT'
          ? input.rooms * input.nights
          : input.pricingMode === 'PER_GUEST'
            ? guests
            : input.pricingMode === 'PER_GUEST_PER_NIGHT'
              ? guests * input.nights
              : 1;
  return base * input.quantity;
}

export function presentHotelBookingAddon(addon: {
  category: string;
  currency: string;
  description: string;
  id: string;
  maxQuantity: number;
  minQuantity: number;
  name: string;
  pricingMode: string;
  taxRateBps: number;
  unitAmount: number;
}): HotelBookingAddonOption {
  return addon as HotelBookingAddonOption;
}
