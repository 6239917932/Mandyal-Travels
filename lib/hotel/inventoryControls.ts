const DAY_MS = 86_400_000;

export type HotelInventoryDay = {
  availableRooms: number;
  closedToArrival?: boolean | null;
  closedToDeparture?: boolean | null;
  maximumStayNights?: number | null;
  minimumStayNights?: number | null;
  nightlyRate?: number | null;
  stayDate: string;
  stopSell: boolean;
};

export type HotelStayInventoryEvaluation = {
  availableRooms?: number;
  restrictionMessage?: string;
  stayNights: number;
  stopSell: boolean;
};

export function hotelStayNights(startDate: string, endDate: string): number {
  return Math.ceil(
    (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
      DAY_MS,
  );
}

export function evaluateHotelStayInventory(
  days: readonly HotelInventoryDay[],
  startDate: string,
  endDate: string,
): HotelStayInventoryEvaluation {
  const stayNights = hotelStayNights(startDate, endDate);
  if (!Number.isFinite(stayNights) || stayNights < 1) {
    return { stayNights, stopSell: true };
  }

  const stayDays = days.filter((day) => day.stayDate >= startDate && day.stayDate < endDate);
  const arrivalDay = days.find((day) => day.stayDate === startDate);
  const departureDay = days.find((day) => day.stayDate === endDate);
  const minimumStay = Math.max(1, ...stayDays.map((day) => day.minimumStayNights ?? 1));
  const maximumStay = Math.min(90, ...stayDays.map((day) => day.maximumStayNights ?? 90));
  const restrictionMessage = arrivalDay?.closedToArrival
    ? 'Arrivals are closed on the selected check-in date.'
    : departureDay?.closedToDeparture
      ? 'Departures are closed on the selected check-out date.'
      : stayNights < minimumStay || stayNights > maximumStay
        ? `This date range requires a stay between ${minimumStay} and ${maximumStay} nights.`
        : undefined;
  const stopSell = Boolean(restrictionMessage) || stayDays.some((day) => day.stopSell);

  return {
    availableRooms: stayDays.length
      ? Math.min(...stayDays.map((day) => (stopSell ? 0 : day.availableRooms)))
      : restrictionMessage
        ? 0
        : undefined,
    restrictionMessage,
    stayNights,
    stopSell,
  };
}

export function calculateHotelStayCharge(
  startDate: string,
  stayNights: number,
  fallbackNightlyRate: number,
  rateDays: readonly Pick<HotelInventoryDay, 'nightlyRate' | 'stayDate'>[],
): number {
  return Array.from({ length: stayNights }, (_, index) => {
    const date = new Date(new Date(`${startDate}T00:00:00Z`).getTime() + index * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return rateDays.find((day) => day.stayDate === date)?.nightlyRate ?? fallbackNightlyRate;
  }).reduce((total, amount) => total + amount, 0);
}
