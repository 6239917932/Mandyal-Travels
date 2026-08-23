type SearchValue = string | string[] | undefined;

const STATES = new Set([
  'ALL',
  'ON_SALE',
  'STOP_SELL',
  'SOLD_OUT',
  'RESTRICTED',
  'RATE_MISSING',
  'CAPACITY_ISSUE',
]);
const HORIZONS = new Set([7, 30, 90]);

export const ADMIN_INVENTORY_PAGE_SIZE = 25;
export const ADMIN_INVENTORY_RESULT_LIMIT = 1000;

export type AdminInventoryFilters = {
  horizon: number;
  page: number;
  query: string;
  state: string;
};

export type AdminInventoryDayInput = {
  availableRooms: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  maximumStayNights: number | null;
  minimumStayNights: number | null;
  stayDate: string;
  stopSell: boolean;
};

export type AdminInventoryAssessment = {
  capacityIssueDates: number;
  health: Exclude<AdminInventoryFilters['state'], 'ALL'>;
  overrideDates: number;
  restrictedDates: number;
  soldOutDates: number;
  stopSellDates: number;
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: SearchValue) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizeAdminInventoryFilters(values: {
  horizon?: SearchValue;
  page?: SearchValue;
  q?: SearchValue;
  state?: SearchValue;
}): AdminInventoryFilters {
  const state = (first(values.state) ?? 'ALL').trim().toUpperCase();
  const horizon = Number(first(values.horizon));
  return {
    horizon: HORIZONS.has(horizon) ? horizon : 30,
    page: positivePage(values.page),
    query: (first(values.q) ?? '').trim().slice(0, 100),
    state: STATES.has(state) ? state : 'ALL',
  };
}

export function assessAdminInventory(input: {
  activeRatePlans: number;
  baseInventory: number;
  days: readonly AdminInventoryDayInput[];
}): AdminInventoryAssessment {
  const stopSellDates = input.days.filter((day) => day.stopSell).length;
  const soldOutDates = input.days.filter((day) => day.availableRooms === 0).length;
  const restrictedDates = input.days.filter(
    (day) =>
      day.closedToArrival ||
      day.closedToDeparture ||
      day.minimumStayNights !== null ||
      day.maximumStayNights !== null,
  ).length;
  const capacityIssueDates = input.days.filter(
    (day) => day.availableRooms < 0 || day.availableRooms > input.baseInventory,
  ).length;
  const health =
    input.activeRatePlans === 0
      ? 'RATE_MISSING'
      : input.baseInventory <= 0 || capacityIssueDates > 0
        ? 'CAPACITY_ISSUE'
        : stopSellDates > 0
          ? 'STOP_SELL'
          : soldOutDates > 0
            ? 'SOLD_OUT'
            : restrictedDates > 0
              ? 'RESTRICTED'
              : 'ON_SALE';
  return {
    capacityIssueDates,
    health,
    overrideDates: input.days.length,
    restrictedDates,
    soldOutDates,
    stopSellDates,
  };
}

export function adminInventoryPath(filters: AdminInventoryFilters, page: number) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters.query) query.set('q', filters.query);
  if (filters.state !== 'ALL') query.set('state', filters.state);
  if (filters.horizon !== 30) query.set('horizon', String(filters.horizon));
  return `/admin/inventory?${query.toString()}`;
}
