export const VEHICLE_MAINTENANCE_CATEGORIES = [
  'Inspection',
  'Preventive service',
  'Repair',
  'Tyres',
  'Cleaning',
  'Compliance',
] as const;

export const VEHICLE_MAINTENANCE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as const;

export type VehicleMaintenanceInput = {
  category: string;
  costAmount?: number;
  description: string;
  endDate: string;
  startDate: string;
  status: string;
  vendor?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function boundedText(value: string, minimum: number, maximum: number): string | undefined {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : undefined;
}

export function normalizeVehicleMaintenance(
  input: VehicleMaintenanceInput,
): VehicleMaintenanceInput {
  const category = VEHICLE_MAINTENANCE_CATEGORIES.find((value) => value === input.category);
  const status = VEHICLE_MAINTENANCE_STATUSES.find((value) => value === input.status);
  const description = boundedText(input.description, 5, 300);
  const vendor = input.vendor ? boundedText(input.vendor, 2, 120) : undefined;
  const start = DATE_PATTERN.test(input.startDate)
    ? Date.parse(`${input.startDate}T00:00:00Z`)
    : NaN;
  const end = DATE_PATTERN.test(input.endDate) ? Date.parse(`${input.endDate}T00:00:00Z`) : NaN;
  if (
    !category ||
    !status ||
    !description ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start
  ) {
    throw new Error('Enter a valid maintenance category, status, date range, and description.');
  }
  if (
    input.costAmount !== undefined &&
    (!Number.isInteger(input.costAmount) || input.costAmount < 0 || input.costAmount > 10_000_000)
  ) {
    throw new Error('Maintenance cost must be a whole amount between ₹0 and ₹1,00,00,000.');
  }
  return {
    category,
    costAmount: input.costAmount,
    description,
    endDate: input.endDate,
    startDate: input.startDate,
    status,
    vendor,
  };
}
