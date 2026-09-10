import { isIsoCalendarDate } from './operationalDate.ts';

const DAY_MS = 86_400_000;
export const HOTEL_OPERATIONAL_REPORT_MAX_DAYS = 366;

export class HotelOperationalReportRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function normalizeHotelOperationalReportRange(input: {
  defaultThrough: string;
  from?: unknown;
  through?: unknown;
}) {
  if (
    input.through !== undefined &&
    (typeof input.through !== 'string' || !isIsoCalendarDate(input.through))
  ) {
    throw new HotelOperationalReportRuleError(
      'INVALID_REPORT_RANGE',
      'Choose a valid reporting end date.',
    );
  }
  if (
    input.from !== undefined &&
    (typeof input.from !== 'string' || !isIsoCalendarDate(input.from))
  ) {
    throw new HotelOperationalReportRuleError(
      'INVALID_REPORT_RANGE',
      'Choose a valid reporting start date.',
    );
  }
  const through =
    typeof input.through === 'string' && isIsoCalendarDate(input.through)
      ? input.through
      : input.defaultThrough;
  const from =
    typeof input.from === 'string' && isIsoCalendarDate(input.from)
      ? input.from
      : addDays(through, -6);
  const days =
    Math.floor(
      (Date.parse(`${through}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS,
    ) + 1;
  if (days < 1 || days > HOTEL_OPERATIONAL_REPORT_MAX_DAYS) {
    throw new HotelOperationalReportRuleError(
      'INVALID_REPORT_RANGE',
      `Choose a valid reporting period of ${HOTEL_OPERATIONAL_REPORT_MAX_DAYS} days or fewer.`,
    );
  }
  return {
    days,
    dates: Array.from({ length: days }, (_, index) => addDays(from, index)),
    from,
    through,
  } as const;
}

type BookingActivity = Readonly<{
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
}>;

type FolioActivity = Readonly<{
  amount: number;
  businessDate: string;
  category: string;
  entryType: string;
  reversalOfType?: string;
}>;

type ServiceActivity = Readonly<{
  businessDate: string;
  serviceMode: string;
  status: string;
  totalAmount: number;
}>;

export function buildHotelOperationalReport(input: {
  bookings: readonly BookingActivity[];
  closes: readonly { businessDate: string }[];
  dates: readonly string[];
  folioEntries: readonly FolioActivity[];
  serviceOrders: readonly ServiceActivity[];
  shifts: readonly { businessDate: string; status: string }[];
}) {
  const rows = input.dates.map((businessDate) => {
    const entries = input.folioEntries.filter((entry) => entry.businessDate === businessDate);
    const folioCharges = entries.reduce((total, entry) => {
      if (entry.entryType === 'CHARGE') {
        return total + (entry.category === 'DISCOUNT' ? -entry.amount : entry.amount);
      }
      if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'CHARGE') {
        return total + (entry.category === 'DISCOUNT' ? entry.amount : -entry.amount);
      }
      return total;
    }, 0);
    const folioPayments = entries.reduce((total, entry) => {
      if (entry.entryType === 'PAYMENT') return total + entry.amount;
      if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'PAYMENT') {
        return total - entry.amount;
      }
      return total;
    }, 0);
    const cashCollections = entries.reduce((total, entry) => {
      if (entry.category !== 'CASH') return total;
      if (entry.entryType === 'PAYMENT') return total + entry.amount;
      if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'PAYMENT') {
        return total - entry.amount;
      }
      return total;
    }, 0);
    const postedServices = input.serviceOrders.filter(
      (order) => order.businessDate === businessDate && order.status === 'POSTED',
    );
    return {
      arrivals: input.bookings.reduce(
        (total, booking) =>
          booking.checkInDate === businessDate ? total + Math.max(0, booking.rooms) : total,
        0,
      ),
      businessDate,
      cashCollections,
      closedCashierShifts: input.shifts.filter(
        (shift) => shift.businessDate === businessDate && shift.status === 'CLOSED',
      ).length,
      departures: input.bookings.reduce(
        (total, booking) =>
          booking.checkOutDate === businessDate ? total + Math.max(0, booking.rooms) : total,
        0,
      ),
      folioCharges,
      folioPayments,
      laundryAndMinibarValue: postedServices
        .filter((order) => ['LAUNDRY', 'MINIBAR'].includes(order.serviceMode))
        .reduce((total, order) => total + order.totalAmount, 0),
      nightAuditClosed: input.closes.some((close) => close.businessDate === businessDate),
      openCashierShifts: input.shifts.filter(
        (shift) => shift.businessDate === businessDate && shift.status === 'OPEN',
      ).length,
      postedServiceOrders: postedServices.length,
      serviceOrderValue: postedServices.reduce((total, order) => total + order.totalAmount, 0),
    } as const;
  });
  return {
    rows,
    totals: rows.reduce(
      (totals, row) => ({
        arrivals: totals.arrivals + row.arrivals,
        cashCollections: totals.cashCollections + row.cashCollections,
        departures: totals.departures + row.departures,
        folioCharges: totals.folioCharges + row.folioCharges,
        folioPayments: totals.folioPayments + row.folioPayments,
        postedServiceOrders: totals.postedServiceOrders + row.postedServiceOrders,
        serviceOrderValue: totals.serviceOrderValue + row.serviceOrderValue,
      }),
      {
        arrivals: 0,
        cashCollections: 0,
        departures: 0,
        folioCharges: 0,
        folioPayments: 0,
        postedServiceOrders: 0,
        serviceOrderValue: 0,
      },
    ),
  } as const;
}
