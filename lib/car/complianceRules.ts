export type VehicleComplianceDates = {
  fitnessExpiry: string;
  insuranceExpiry: string;
  permitExpiry: string;
  pollutionExpiry: string;
  registrationExpiry: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeVehicleComplianceDates(
  input: VehicleComplianceDates,
): VehicleComplianceDates {
  const values = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value.trim()]),
  ) as unknown as VehicleComplianceDates;
  for (const value of Object.values(values)) {
    if (!value) continue;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !ISO_DATE.test(value) ||
      Number.isNaN(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      throw new Error('Compliance expiry dates must be valid calendar dates.');
  }
  return values;
}

export function vehicleComplianceState(
  input: VehicleComplianceDates,
  today: string,
): 'COMPLETE' | 'EXPIRING' | 'EXPIRED' | 'INCOMPLETE' {
  const values = Object.values(input);
  if (values.some((value) => !value)) return 'INCOMPLETE';
  if (values.some((value) => value < today)) return 'EXPIRED';
  const warning = new Date(`${today}T00:00:00.000Z`);
  warning.setUTCDate(warning.getUTCDate() + 30);
  return values.some((value) => value <= warning.toISOString().slice(0, 10))
    ? 'EXPIRING'
    : 'COMPLETE';
}
