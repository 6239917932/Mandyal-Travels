export const DIRECT_CAR_SERVICE_MODES = ['SELF_DRIVE', 'CHAUFFEUR'] as const;
export const DIRECT_CAR_VEHICLE_STATES = ['ACTIVE', 'MAINTENANCE', 'OFFLINE'] as const;
export const DIRECT_CAR_DRIVER_STATES = ['ACTIVE', 'SUSPENDED', 'OFFLINE'] as const;
export const DIRECT_CAR_LICENSE_CLASSES = ['LMV', 'TRANSPORT', 'HMV'] as const;

export type DirectCarServiceMode = (typeof DIRECT_CAR_SERVICE_MODES)[number];
export type DirectCarVehicleState = (typeof DIRECT_CAR_VEHICLE_STATES)[number];
export type DirectCarDriverState = (typeof DIRECT_CAR_DRIVER_STATES)[number];
export type DirectCarLicenseClass = (typeof DIRECT_CAR_LICENSE_CLASSES)[number];

type TimeWindow = Readonly<{ startAt: string; endAt: string }>;

type NormalizedVehicle = Readonly<{
  displayName: string;
  category: string;
  seats: number;
  state: DirectCarVehicleState;
  requiredLicenseClass: DirectCarLicenseClass;
  documents: Readonly<{
    registrationExpiry: string;
    insuranceExpiry: string;
    permitExpiry: string;
    fitnessExpiry: string;
    pollutionExpiry: string;
  }>;
}>;

type NormalizedDriver = Readonly<{
  state: DirectCarDriverState;
  licenseClasses: readonly DirectCarLicenseClass[];
  licenseExpiry: string;
  identityVerified: boolean;
  backgroundCheckExpiry: string;
  medicalFitnessExpiry: string;
}>;

export type DirectCarAssignmentInput = Readonly<{
  mode: unknown;
  serviceStartAt: unknown;
  serviceEndAt: unknown;
  vehicle: unknown;
  driver?: unknown;
  vehicleAvailabilityWindows: unknown;
  driverAvailabilityWindows?: unknown;
  vehicleAssignmentConflicts: unknown;
  driverAssignmentConflicts?: unknown;
  vehicleMaintenanceWindows: unknown;
}>;

export type CustomerSafeDirectCarAssignment = Readonly<{
  version: 1;
  mode: DirectCarServiceMode;
  serviceStartAt: string;
  serviceEndAt: string;
  vehicle: Readonly<{ displayName: string; category: string; seats: number }>;
  chauffeur: Readonly<{ assigned: boolean }>;
  compliance: Readonly<{ verified: true; documentsValidThrough: string }>;
}>;

export type DirectCarAssignmentErrorCode =
  | 'INVALID_MODE'
  | 'INVALID_SERVICE_WINDOW'
  | 'INVALID_VEHICLE'
  | 'VEHICLE_OFFLINE'
  | 'VEHICLE_MAINTENANCE'
  | 'VEHICLE_DOCUMENT_INVALID'
  | 'VEHICLE_UNAVAILABLE'
  | 'VEHICLE_ASSIGNMENT_CONFLICT'
  | 'DRIVER_REQUIRED'
  | 'DRIVER_NOT_ALLOWED'
  | 'INVALID_DRIVER'
  | 'DRIVER_INACTIVE'
  | 'DRIVER_DOCUMENT_INVALID'
  | 'DRIVER_LICENSE_INVALID'
  | 'DRIVER_UNAVAILABLE'
  | 'DRIVER_ASSIGNMENT_CONFLICT';

export class DirectCarAssignmentError extends Error {
  readonly code: DirectCarAssignmentErrorCode;

  constructor(code: DirectCarAssignmentErrorCode, message: string) {
    super(message);
    this.name = 'DirectCarAssignmentError';
    this.code = code;
  }
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MAX_SERVICE_DURATION_MS = 31 * 24 * 60 * 60 * 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMember<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function readBoundedText(
  record: Record<string, unknown>,
  key: string,
  maximum: number,
): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= 1 && normalized.length <= maximum ? normalized : undefined;
}

function parseInstant(value: unknown): { iso: string; milliseconds: number } | undefined {
  if (typeof value !== 'string' || !ISO_INSTANT_PATTERN.test(value)) return undefined;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? { iso: value, milliseconds } : undefined;
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const milliseconds = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === value
  );
}

function parseWindows(
  value: unknown,
  code: DirectCarAssignmentErrorCode,
  label: string,
): readonly TimeWindow[] {
  if (!Array.isArray(value)) {
    throw new DirectCarAssignmentError(code, `${label} must be a list of valid service windows.`);
  }
  return Object.freeze(
    value.map((candidate) => {
      if (!isRecord(candidate)) {
        throw new DirectCarAssignmentError(code, `${label} contains an invalid service window.`);
      }
      const start = parseInstant(candidate.startAt);
      const end = parseInstant(candidate.endAt);
      if (!start || !end || end.milliseconds <= start.milliseconds) {
        throw new DirectCarAssignmentError(code, `${label} contains an invalid service window.`);
      }
      return Object.freeze({ startAt: start.iso, endAt: end.iso });
    }),
  );
}

function containsService(window: TimeWindow, serviceStart: number, serviceEnd: number): boolean {
  return Date.parse(window.startAt) <= serviceStart && Date.parse(window.endAt) >= serviceEnd;
}

function overlapsService(window: TimeWindow, serviceStart: number, serviceEnd: number): boolean {
  return Date.parse(window.startAt) < serviceEnd && Date.parse(window.endAt) > serviceStart;
}

function documentsCoverService(
  documents: Readonly<Record<string, string>>,
  serviceEndDate: string,
): boolean {
  return Object.values(documents).every((expiry) => expiry >= serviceEndDate);
}

function parseVehicle(value: unknown): NormalizedVehicle {
  if (!isRecord(value)) {
    throw new DirectCarAssignmentError('INVALID_VEHICLE', 'Vehicle details are required.');
  }
  const displayName = readBoundedText(value, 'displayName', 120);
  const category = readBoundedText(value, 'category', 60);
  const seats = value.seats;
  if (
    !displayName ||
    !category ||
    !Number.isSafeInteger(seats) ||
    (seats as number) < 1 ||
    (seats as number) > 60 ||
    !isMember(DIRECT_CAR_VEHICLE_STATES, value.state) ||
    !isMember(DIRECT_CAR_LICENSE_CLASSES, value.requiredLicenseClass) ||
    !isRecord(value.documents)
  ) {
    throw new DirectCarAssignmentError('INVALID_VEHICLE', 'Vehicle details are invalid.');
  }

  const documents = value.documents;
  const documentKeys = [
    'registrationExpiry',
    'insuranceExpiry',
    'permitExpiry',
    'fitnessExpiry',
    'pollutionExpiry',
  ] as const;
  const expiries = documentKeys.map((key) => documents[key]);
  if (!expiries.every(isValidIsoDate)) {
    throw new DirectCarAssignmentError(
      'VEHICLE_DOCUMENT_INVALID',
      'Vehicle compliance documents are invalid.',
    );
  }

  return Object.freeze({
    displayName,
    category,
    seats: seats as number,
    state: value.state,
    requiredLicenseClass: value.requiredLicenseClass,
    documents: Object.freeze({
      registrationExpiry: expiries[0],
      insuranceExpiry: expiries[1],
      permitExpiry: expiries[2],
      fitnessExpiry: expiries[3],
      pollutionExpiry: expiries[4],
    }),
  });
}

function parseDriver(value: unknown): NormalizedDriver {
  if (!isRecord(value)) {
    throw new DirectCarAssignmentError('DRIVER_REQUIRED', 'An assigned chauffeur is required.');
  }
  if (
    !isMember(DIRECT_CAR_DRIVER_STATES, value.state) ||
    !Array.isArray(value.licenseClasses) ||
    value.licenseClasses.length === 0 ||
    !value.licenseClasses.every((item) => isMember(DIRECT_CAR_LICENSE_CLASSES, item)) ||
    !isValidIsoDate(value.licenseExpiry) ||
    typeof value.identityVerified !== 'boolean' ||
    !isValidIsoDate(value.backgroundCheckExpiry) ||
    !isValidIsoDate(value.medicalFitnessExpiry)
  ) {
    throw new DirectCarAssignmentError('INVALID_DRIVER', 'Assigned chauffeur details are invalid.');
  }
  return Object.freeze({
    state: value.state,
    licenseClasses: Object.freeze([...value.licenseClasses]),
    licenseExpiry: value.licenseExpiry,
    identityVerified: value.identityVerified,
    backgroundCheckExpiry: value.backgroundCheckExpiry,
    medicalFitnessExpiry: value.medicalFitnessExpiry,
  });
}

export function validateDirectCarAssignment(
  input: DirectCarAssignmentInput,
): CustomerSafeDirectCarAssignment {
  if (!isMember(DIRECT_CAR_SERVICE_MODES, input.mode)) {
    throw new DirectCarAssignmentError('INVALID_MODE', 'Direct car service mode is unsupported.');
  }
  const serviceStart = parseInstant(input.serviceStartAt);
  const serviceEnd = parseInstant(input.serviceEndAt);
  if (
    !serviceStart ||
    !serviceEnd ||
    serviceEnd.milliseconds <= serviceStart.milliseconds ||
    serviceEnd.milliseconds - serviceStart.milliseconds > MAX_SERVICE_DURATION_MS
  ) {
    throw new DirectCarAssignmentError(
      'INVALID_SERVICE_WINDOW',
      'Service window is invalid or exceeds 31 days.',
    );
  }

  const vehicle = parseVehicle(input.vehicle);
  if (vehicle.state === 'OFFLINE') {
    throw new DirectCarAssignmentError('VEHICLE_OFFLINE', 'Vehicle is offline.');
  }
  if (vehicle.state === 'MAINTENANCE') {
    throw new DirectCarAssignmentError('VEHICLE_MAINTENANCE', 'Vehicle is under maintenance.');
  }
  const serviceEndDate = serviceEnd.iso.slice(0, 10);
  if (!documentsCoverService(vehicle.documents, serviceEndDate)) {
    throw new DirectCarAssignmentError(
      'VEHICLE_DOCUMENT_INVALID',
      'Vehicle compliance documents do not cover the service window.',
    );
  }

  const vehicleAvailability = parseWindows(
    input.vehicleAvailabilityWindows,
    'VEHICLE_UNAVAILABLE',
    'Vehicle availability',
  );
  if (
    !vehicleAvailability.some((window) =>
      containsService(window, serviceStart.milliseconds, serviceEnd.milliseconds),
    )
  ) {
    throw new DirectCarAssignmentError(
      'VEHICLE_UNAVAILABLE',
      'Vehicle is unavailable for the complete service window.',
    );
  }
  const maintenance = parseWindows(
    input.vehicleMaintenanceWindows,
    'VEHICLE_MAINTENANCE',
    'Vehicle maintenance',
  );
  if (
    maintenance.some((window) =>
      overlapsService(window, serviceStart.milliseconds, serviceEnd.milliseconds),
    )
  ) {
    throw new DirectCarAssignmentError(
      'VEHICLE_MAINTENANCE',
      'Vehicle maintenance overlaps the service window.',
    );
  }
  const vehicleConflicts = parseWindows(
    input.vehicleAssignmentConflicts,
    'VEHICLE_ASSIGNMENT_CONFLICT',
    'Vehicle assignments',
  );
  if (
    vehicleConflicts.some((window) =>
      overlapsService(window, serviceStart.milliseconds, serviceEnd.milliseconds),
    )
  ) {
    throw new DirectCarAssignmentError(
      'VEHICLE_ASSIGNMENT_CONFLICT',
      'Vehicle already has an overlapping assignment.',
    );
  }

  if (input.mode === 'SELF_DRIVE') {
    if (input.driver !== undefined && input.driver !== null) {
      throw new DirectCarAssignmentError(
        'DRIVER_NOT_ALLOWED',
        'Self-drive service cannot include an assigned chauffeur.',
      );
    }
  } else {
    const driver = parseDriver(input.driver);
    if (driver.state !== 'ACTIVE') {
      throw new DirectCarAssignmentError('DRIVER_INACTIVE', 'Assigned chauffeur is not active.');
    }
    if (
      !driver.identityVerified ||
      driver.licenseExpiry < serviceEndDate ||
      driver.backgroundCheckExpiry < serviceEndDate ||
      driver.medicalFitnessExpiry < serviceEndDate
    ) {
      throw new DirectCarAssignmentError(
        'DRIVER_DOCUMENT_INVALID',
        'Chauffeur compliance documents do not cover the service window.',
      );
    }
    if (!driver.licenseClasses.includes(vehicle.requiredLicenseClass)) {
      throw new DirectCarAssignmentError(
        'DRIVER_LICENSE_INVALID',
        'Chauffeur is not licensed for the assigned vehicle.',
      );
    }
    const driverAvailability = parseWindows(
      input.driverAvailabilityWindows,
      'DRIVER_UNAVAILABLE',
      'Driver availability',
    );
    if (
      !driverAvailability.some((window) =>
        containsService(window, serviceStart.milliseconds, serviceEnd.milliseconds),
      )
    ) {
      throw new DirectCarAssignmentError(
        'DRIVER_UNAVAILABLE',
        'Chauffeur is unavailable for the complete service window.',
      );
    }
    const driverConflicts = parseWindows(
      input.driverAssignmentConflicts,
      'DRIVER_ASSIGNMENT_CONFLICT',
      'Driver assignments',
    );
    if (
      driverConflicts.some((window) =>
        overlapsService(window, serviceStart.milliseconds, serviceEnd.milliseconds),
      )
    ) {
      throw new DirectCarAssignmentError(
        'DRIVER_ASSIGNMENT_CONFLICT',
        'Chauffeur has an overlapping assignment.',
      );
    }
  }

  return Object.freeze({
    version: 1,
    mode: input.mode,
    serviceStartAt: serviceStart.iso,
    serviceEndAt: serviceEnd.iso,
    vehicle: Object.freeze({
      displayName: vehicle.displayName,
      category: vehicle.category,
      seats: vehicle.seats,
    }),
    chauffeur: Object.freeze({ assigned: input.mode === 'CHAUFFEUR' }),
    compliance: Object.freeze({ verified: true, documentsValidThrough: serviceEndDate }),
  });
}
