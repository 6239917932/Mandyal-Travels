import { calculateHotelFolioBalance, type HotelFolioBalanceEntry } from './folio.ts';
import { isIsoCalendarDate } from './operationalDate.ts';

const DAY_MS = 86_400_000;

export type OwnerOverviewBooking = Readonly<{
  checkInDate: string;
  checkOutDate: string;
  createdAt?: Date | string;
  currency: string;
  entries: readonly HotelFolioBalanceEntry[];
  onlinePayment?: { amount: number; status: string } | null;
  onlineRefunds?: readonly { amount: number; status: string }[];
  rooms: number;
  source: string;
  totalAmount: number;
}>;

export type OwnerOutletOrder = Readonly<{
  outletName: string;
  serviceMode: string;
  status: string;
  totalAmount: number;
}>;

function dateValue(value: string): number | undefined {
  if (!isIsoCalendarDate(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) ? time : undefined;
}

export function stayOverlapsBusinessDate(
  checkInDate: string,
  checkOutDate: string,
  businessDate: string,
): boolean {
  const start = dateValue(checkInDate);
  const end = dateValue(checkOutDate);
  const target = dateValue(businessDate);
  return (
    start !== undefined &&
    end !== undefined &&
    target !== undefined &&
    start <= target &&
    end > target
  );
}

export function allocateBookingValueForDate(input: {
  businessDate: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
}): number {
  const start = dateValue(input.checkInDate);
  const end = dateValue(input.checkOutDate);
  const target = dateValue(input.businessDate);
  if (
    start === undefined ||
    end === undefined ||
    target === undefined ||
    end <= start ||
    target < start ||
    target >= end ||
    !Number.isSafeInteger(input.totalAmount) ||
    input.totalAmount < 0
  ) {
    return 0;
  }
  const nights = Math.round((end - start) / DAY_MS);
  const offset = Math.round((target - start) / DAY_MS);
  const base = Math.floor(input.totalAmount / nights);
  return base + (offset < input.totalAmount % nights ? 1 : 0);
}

export function calculateOwnerDailyPerformance(input: {
  activeRooms: number;
  bookings: readonly Pick<
    OwnerOverviewBooking,
    'checkInDate' | 'checkOutDate' | 'rooms' | 'totalAmount'
  >[];
  businessDate: string;
}) {
  const roomsSold = input.bookings.reduce(
    (total, booking) =>
      stayOverlapsBusinessDate(booking.checkInDate, booking.checkOutDate, input.businessDate) &&
      Number.isSafeInteger(booking.rooms) &&
      booking.rooms > 0
        ? total + booking.rooms
        : total,
    0,
  );
  const bookedAccommodationValue = input.bookings.reduce(
    (total, booking) =>
      total + allocateBookingValueForDate({ ...booking, businessDate: input.businessDate }),
    0,
  );
  const activeRooms = Math.max(0, Math.floor(input.activeRooms));
  return {
    activeRooms,
    adr: roomsSold ? Math.round(bookedAccommodationValue / roomsSold) : 0,
    bookedAccommodationValue,
    occupancyPercent: activeRooms ? Math.round((roomsSold / activeRooms) * 100) : null,
    revPar: activeRooms ? Math.round(bookedAccommodationValue / activeRooms) : null,
    roomsSold,
  } as const;
}

export function calculateOwnerFinancialTotals(bookings: readonly OwnerOverviewBooking[]) {
  return bookings.reduce(
    (totals, booking) => {
      const balance = calculateHotelFolioBalance({
        bookingTotalAmount: booking.totalAmount,
        entries: booking.entries,
        onlinePayment: booking.onlinePayment,
        onlineRefunds: booking.onlineRefunds,
      });
      totals.charges += balance.charges;
      totals.collections += balance.payments;
      totals.creditBalances += Math.max(0, -balance.balance);
      totals.receivables += Math.max(0, balance.balance);
      return totals;
    },
    { charges: 0, collections: 0, creditBalances: 0, receivables: 0 },
  );
}

export function buildOwnerSourceMix(bookings: readonly OwnerOverviewBooking[]) {
  const values = new Map<string, { bookedValue: number; bookings: number }>();
  for (const booking of bookings) {
    const source = booking.source.trim().toUpperCase().slice(0, 40) || 'UNKNOWN';
    const current = values.get(source) ?? { bookedValue: 0, bookings: 0 };
    current.bookedValue += booking.totalAmount;
    current.bookings += 1;
    values.set(source, current);
  }
  return [...values.entries()]
    .map(([source, value]) => ({ source, ...value }))
    .sort(
      (left, right) =>
        right.bookedValue - left.bookedValue || left.source.localeCompare(right.source),
    );
}

export function calculateBookingPace(input: {
  bookings: readonly Pick<
    OwnerOverviewBooking,
    'checkInDate' | 'createdAt' | 'rooms' | 'totalAmount'
  >[];
  businessDate: string;
}) {
  const businessTime = dateValue(input.businessDate);
  if (businessTime === undefined) {
    return {
      currentBookings: 0,
      currentRooms: 0,
      currentValue: 0,
      previousBookings: 0,
      previousRooms: 0,
      previousValue: 0,
    } as const;
  }
  const currentStart = businessTime - 6 * DAY_MS;
  const previousStart = businessTime - 13 * DAY_MS;
  const futureThrough = businessTime + 29 * DAY_MS;
  const totals = {
    currentBookings: 0,
    currentRooms: 0,
    currentValue: 0,
    previousBookings: 0,
    previousRooms: 0,
    previousValue: 0,
  };
  for (const booking of input.bookings) {
    const arrival = dateValue(booking.checkInDate);
    const created = booking.createdAt ? new Date(booking.createdAt).getTime() : Number.NaN;
    if (
      arrival === undefined ||
      arrival < businessTime ||
      arrival > futureThrough ||
      !Number.isFinite(created)
    )
      continue;
    const bucket =
      created >= currentStart && created < businessTime + DAY_MS
        ? 'current'
        : created >= previousStart && created < currentStart
          ? 'previous'
          : undefined;
    if (!bucket) continue;
    const rooms = Number.isSafeInteger(booking.rooms) && booking.rooms > 0 ? booking.rooms : 0;
    const value =
      Number.isSafeInteger(booking.totalAmount) && booking.totalAmount > 0
        ? booking.totalAmount
        : 0;
    if (bucket === 'current') {
      totals.currentBookings += 1;
      totals.currentRooms += rooms;
      totals.currentValue += value;
    } else {
      totals.previousBookings += 1;
      totals.previousRooms += rooms;
      totals.previousValue += value;
    }
  }
  return totals;
}

export function buildOutletPerformance(orders: readonly OwnerOutletOrder[]) {
  const outlets = new Map<string, { orders: number; postedValue: number }>();
  for (const order of orders) {
    if (
      order.status !== 'POSTED' ||
      !Number.isSafeInteger(order.totalAmount) ||
      order.totalAmount < 0
    )
      continue;
    const outlet =
      order.outletName.trim().slice(0, 80) ||
      order.serviceMode.trim().slice(0, 40) ||
      'Unassigned outlet';
    const current = outlets.get(outlet) ?? { orders: 0, postedValue: 0 };
    current.orders += 1;
    current.postedValue += order.totalAmount;
    outlets.set(outlet, current);
  }
  return [...outlets.entries()]
    .map(([outlet, values]) => ({ outlet, ...values }))
    .sort(
      (left, right) =>
        right.postedValue - left.postedValue || left.outlet.localeCompare(right.outlet),
    );
}
