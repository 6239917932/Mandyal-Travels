import { calculateOwnerDailyPerformance, type OwnerOverviewBooking } from './ownerOverview.ts';
import { isIsoCalendarDate } from './operationalDate.ts';

const DAY_MS = 86_400_000;

export type RevenueDataQuality = 'ESTABLISHED' | 'INSUFFICIENT' | 'LIMITED' | 'UNAVAILABLE';
export type RevenueReviewPriority = 'CRITICAL' | 'HIGH' | 'REVIEW';
export type RevenueReviewPrompt = Readonly<{
  action: string;
  businessDate: string;
  priority: RevenueReviewPriority;
  reason: string;
}>;

function dateValue(value: string): number | undefined {
  if (!isIsoCalendarDate(value)) return undefined;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function addDays(value: string, days: number): string {
  const parsed = dateValue(value);
  if (parsed === undefined) return value;
  return new Date(parsed + days * DAY_MS).toISOString().slice(0, 10);
}

export function buildRevenueDemandCalendar(input: {
  activeRooms: number;
  bookings: readonly Pick<
    OwnerOverviewBooking,
    'checkInDate' | 'checkOutDate' | 'rooms' | 'totalAmount'
  >[];
  businessDate: string;
  horizonDays?: number;
}) {
  const horizonDays = Math.min(90, Math.max(7, Math.floor(input.horizonDays ?? 30)));
  return Array.from({ length: horizonDays }, (_, index) => {
    const businessDate = addDays(input.businessDate, index);
    const performance = calculateOwnerDailyPerformance({
      activeRooms: input.activeRooms,
      bookings: input.bookings,
      businessDate,
    });
    return {
      businessDate,
      ...performance,
      oversoldRooms: Math.max(0, performance.roomsSold - performance.activeRooms),
    } as const;
  });
}

export function assessRevenueDataQuality(input: {
  activeRooms: number;
  bookings: readonly Pick<OwnerOverviewBooking, 'checkInDate' | 'checkOutDate'>[];
  businessDate: string;
}) {
  const businessTime = dateValue(input.businessDate);
  if (input.activeRooms <= 0 || businessTime === undefined) {
    return {
      historicalBookings: 0,
      label: 'Unavailable',
      message:
        'Activate physical rooms and a valid operational date before using revenue guidance.',
      observationDays: 0,
      quality: 'UNAVAILABLE' as RevenueDataQuality,
    } as const;
  }

  const lookbackStart = businessTime - 90 * DAY_MS;
  const completed = input.bookings.filter((booking) => {
    const arrival = dateValue(booking.checkInDate);
    const departure = dateValue(booking.checkOutDate);
    return (
      arrival !== undefined &&
      departure !== undefined &&
      departure <= businessTime &&
      departure > lookbackStart &&
      departure > arrival
    );
  });
  const observationDates = new Set(
    completed.map((booking) => booking.checkOutDate).filter(isIsoCalendarDate),
  );

  if (completed.length < 10 || observationDates.size < 7) {
    return {
      historicalBookings: completed.length,
      label: 'Insufficient history',
      message:
        'Current booked occupancy is available, but pricing guidance is withheld until at least 10 completed bookings across 7 departure dates exist.',
      observationDays: observationDates.size,
      quality: 'INSUFFICIENT' as RevenueDataQuality,
    } as const;
  }
  if (completed.length < 30 || observationDates.size < 21) {
    return {
      historicalBookings: completed.length,
      label: 'Limited history',
      message:
        'Use the review prompts cautiously. More completed stays and operating dates are required before trend comparisons become established.',
      observationDays: observationDates.size,
      quality: 'LIMITED' as RevenueDataQuality,
    } as const;
  }
  return {
    historicalBookings: completed.length,
    label: 'Established history',
    message:
      'The minimum internal history threshold is met. Guidance remains review-only and does not include competitor or external market data.',
    observationDays: observationDates.size,
    quality: 'ESTABLISHED' as RevenueDataQuality,
  } as const;
}

export function buildRevenueReviewQueue(input: {
  calendar: readonly ReturnType<typeof buildRevenueDemandCalendar>[number][];
  dataQuality: RevenueDataQuality;
}) {
  const prompts: RevenueReviewPrompt[] = [];
  input.calendar.forEach((day, index) => {
    if (day.oversoldRooms > 0) {
      prompts.push({
        action: 'Review room allocation and stop-sell controls immediately.',
        businessDate: day.businessDate,
        priority: 'CRITICAL',
        reason: `${day.oversoldRooms} room${day.oversoldRooms === 1 ? '' : 's'} above active capacity`,
      });
      return;
    }
    if (day.occupancyPercent !== null && day.occupancyPercent >= 85) {
      prompts.push({
        action: 'Review remaining inventory, rate posture and stay restrictions.',
        businessDate: day.businessDate,
        priority: 'HIGH',
        reason: `${day.occupancyPercent}% booked occupancy`,
      });
      return;
    }
    if (index < 14 && day.occupancyPercent !== null && day.occupancyPercent <= 25) {
      prompts.push({
        action: 'Review listing visibility, open inventory and restrictive rules.',
        businessDate: day.businessDate,
        priority: 'REVIEW',
        reason: `${day.occupancyPercent}% booked occupancy within 14 days`,
      });
    }
  });

  return prompts
    .sort((left, right) => {
      const rank: Record<RevenueReviewPriority, number> = { CRITICAL: 0, HIGH: 1, REVIEW: 2 };
      return (
        rank[left.priority] - rank[right.priority] ||
        left.businessDate.localeCompare(right.businessDate)
      );
    })
    .slice(0, input.dataQuality === 'UNAVAILABLE' ? 0 : 12);
}

export function summarizeRevenueDemand(
  calendar: readonly ReturnType<typeof buildRevenueDemandCalendar>[number][],
) {
  const firstSeven = calendar.slice(0, 7);
  const occupancyValues = firstSeven
    .map((day) => day.occupancyPercent)
    .filter((value): value is number => value !== null);
  return {
    averageSevenDayOccupancy:
      occupancyValues.length > 0
        ? Math.round(
            occupancyValues.reduce((total, value) => total + value, 0) / occupancyValues.length,
          )
        : null,
    bookedRoomNights: calendar.reduce((total, day) => total + day.roomsSold, 0),
    oversoldDates: calendar.filter((day) => day.oversoldRooms > 0).length,
    projectedBookedValue: calendar.reduce((total, day) => total + day.bookedAccommodationValue, 0),
  } as const;
}
