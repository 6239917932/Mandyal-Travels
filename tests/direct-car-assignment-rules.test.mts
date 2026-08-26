import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DirectCarAssignmentError,
  validateDirectCarAssignment,
} from '../services/directCarAssignmentRules.ts';

const serviceWindow = Object.freeze({
  startAt: '2026-10-10T10:00:00Z',
  endAt: '2026-10-12T10:00:00Z',
});
const vehicle = Object.freeze({
  displayName: 'Mandyal Ertiga',
  category: 'SUV',
  seats: 7,
  state: 'ACTIVE',
  requiredLicenseClass: 'TRANSPORT',
  documents: {
    registrationExpiry: '2027-01-01',
    insuranceExpiry: '2027-01-01',
    permitExpiry: '2027-01-01',
    fitnessExpiry: '2027-01-01',
    pollutionExpiry: '2027-01-01',
  },
});
const driver = Object.freeze({
  state: 'ACTIVE',
  licenseClasses: ['LMV', 'TRANSPORT'],
  licenseExpiry: '2027-01-01',
  identityVerified: true,
  backgroundCheckExpiry: '2027-01-01',
  medicalFitnessExpiry: '2027-01-01',
});

function input(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'CHAUFFEUR',
    serviceStartAt: serviceWindow.startAt,
    serviceEndAt: serviceWindow.endAt,
    vehicle,
    driver,
    vehicleAvailabilityWindows: [serviceWindow],
    driverAvailabilityWindows: [serviceWindow],
    vehicleAssignmentConflicts: [],
    driverAssignmentConflicts: [],
    vehicleMaintenanceWindows: [],
    ...overrides,
  };
}

function expectCode(code: DirectCarAssignmentError['code'], callback: () => unknown) {
  assert.throws(
    callback,
    (error: unknown) => error instanceof DirectCarAssignmentError && error.code === code,
  );
}

test('returns a deeply frozen customer-safe chauffeur assignment', () => {
  const result = validateDirectCarAssignment(input());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.vehicle), true);
  assert.equal(Object.isFrozen(result.chauffeur), true);
  assert.equal(Object.isFrozen(result.compliance), true);
  assert.deepEqual(result, {
    version: 1,
    mode: 'CHAUFFEUR',
    serviceStartAt: serviceWindow.startAt,
    serviceEndAt: serviceWindow.endAt,
    vehicle: { displayName: 'Mandyal Ertiga', category: 'SUV', seats: 7 },
    chauffeur: { assigned: true },
    compliance: { verified: true, documentsValidThrough: '2026-10-12' },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /license|expiry|registration|identity|background|medical/i,
  );
});

test('accepts self-drive without chauffeur data and rejects assigned chauffeurs', () => {
  const result = validateDirectCarAssignment(
    input({
      mode: 'SELF_DRIVE',
      driver: undefined,
      driverAvailabilityWindows: undefined,
      driverAssignmentConflicts: undefined,
    }),
  );
  assert.equal(result.chauffeur.assigned, false);
  expectCode('DRIVER_NOT_ALLOWED', () =>
    validateDirectCarAssignment(input({ mode: 'SELF_DRIVE' })),
  );
});

test('rejects missing chauffeur and unsupported modes', () => {
  expectCode('DRIVER_REQUIRED', () => validateDirectCarAssignment(input({ driver: undefined })));
  expectCode('INVALID_MODE', () => validateDirectCarAssignment(input({ mode: 'TAXI' })));
});

test('rejects malformed, reversed, and overlong service windows', () => {
  expectCode('INVALID_SERVICE_WINDOW', () =>
    validateDirectCarAssignment(input({ serviceStartAt: '10-10-2026' })),
  );
  expectCode('INVALID_SERVICE_WINDOW', () =>
    validateDirectCarAssignment(input({ serviceEndAt: serviceWindow.startAt })),
  );
  expectCode('INVALID_SERVICE_WINDOW', () =>
    validateDirectCarAssignment(input({ serviceEndAt: '2026-12-12T10:00:00Z' })),
  );
});

test('requires vehicle documents to remain valid through service end', () => {
  expectCode('VEHICLE_DOCUMENT_INVALID', () =>
    validateDirectCarAssignment(
      input({
        vehicle: { ...vehicle, documents: { ...vehicle.documents, insuranceExpiry: '2026-10-11' } },
      }),
    ),
  );
  const exactExpiry = validateDirectCarAssignment(
    input({
      vehicle: { ...vehicle, documents: { ...vehicle.documents, insuranceExpiry: '2026-10-12' } },
    }),
  );
  assert.equal(exactExpiry.compliance.verified, true);
});

test('rejects offline and maintenance vehicle states', () => {
  expectCode('VEHICLE_OFFLINE', () =>
    validateDirectCarAssignment(input({ vehicle: { ...vehicle, state: 'OFFLINE' } })),
  );
  expectCode('VEHICLE_MAINTENANCE', () =>
    validateDirectCarAssignment(input({ vehicle: { ...vehicle, state: 'MAINTENANCE' } })),
  );
});

test('requires one availability window to contain the complete service', () => {
  expectCode('VEHICLE_UNAVAILABLE', () =>
    validateDirectCarAssignment(
      input({
        vehicleAvailabilityWindows: [
          { startAt: serviceWindow.startAt, endAt: '2026-10-11T10:00:00Z' },
        ],
      }),
    ),
  );
  expectCode('DRIVER_UNAVAILABLE', () =>
    validateDirectCarAssignment(
      input({
        driverAvailabilityWindows: [
          { startAt: '2026-10-11T10:00:00Z', endAt: serviceWindow.endAt },
        ],
      }),
    ),
  );
});

test('rejects overlapping vehicle and chauffeur assignments while allowing adjacent windows', () => {
  expectCode('VEHICLE_ASSIGNMENT_CONFLICT', () =>
    validateDirectCarAssignment(
      input({
        vehicleAssignmentConflicts: [
          { startAt: '2026-10-09T10:00:00Z', endAt: '2026-10-10T11:00:00Z' },
        ],
      }),
    ),
  );
  expectCode('DRIVER_ASSIGNMENT_CONFLICT', () =>
    validateDirectCarAssignment(
      input({
        driverAssignmentConflicts: [
          { startAt: '2026-10-12T09:00:00Z', endAt: '2026-10-13T10:00:00Z' },
        ],
      }),
    ),
  );
  const adjacent = validateDirectCarAssignment(
    input({
      vehicleAssignmentConflicts: [
        { startAt: '2026-10-09T10:00:00Z', endAt: serviceWindow.startAt },
      ],
      driverAssignmentConflicts: [{ startAt: serviceWindow.endAt, endAt: '2026-10-13T10:00:00Z' }],
    }),
  );
  assert.equal(adjacent.compliance.verified, true);
});

test('rejects maintenance overlap while allowing adjacent maintenance', () => {
  expectCode('VEHICLE_MAINTENANCE', () =>
    validateDirectCarAssignment(
      input({
        vehicleMaintenanceWindows: [
          { startAt: '2026-10-11T10:00:00Z', endAt: '2026-10-13T10:00:00Z' },
        ],
      }),
    ),
  );
  assert.equal(
    validateDirectCarAssignment(
      input({
        vehicleMaintenanceWindows: [
          { startAt: '2026-10-09T10:00:00Z', endAt: serviceWindow.startAt },
        ],
      }),
    ).compliance.verified,
    true,
  );
});

test('rejects inactive, unverified, expired, and improperly licensed chauffeurs', () => {
  expectCode('DRIVER_INACTIVE', () =>
    validateDirectCarAssignment(input({ driver: { ...driver, state: 'SUSPENDED' } })),
  );
  expectCode('DRIVER_DOCUMENT_INVALID', () =>
    validateDirectCarAssignment(input({ driver: { ...driver, identityVerified: false } })),
  );
  expectCode('DRIVER_DOCUMENT_INVALID', () =>
    validateDirectCarAssignment(
      input({ driver: { ...driver, medicalFitnessExpiry: '2026-10-11' } }),
    ),
  );
  expectCode('DRIVER_LICENSE_INVALID', () =>
    validateDirectCarAssignment(input({ driver: { ...driver, licenseClasses: ['LMV'] } })),
  );
});

test('fails closed for malformed vehicle, driver, and schedule records', () => {
  expectCode('INVALID_VEHICLE', () => validateDirectCarAssignment(input({ vehicle: null })));
  expectCode('INVALID_DRIVER', () =>
    validateDirectCarAssignment(input({ driver: { ...driver, licenseClasses: [] } })),
  );
  expectCode('VEHICLE_UNAVAILABLE', () =>
    validateDirectCarAssignment(input({ vehicleAvailabilityWindows: null })),
  );
  expectCode('DRIVER_ASSIGNMENT_CONFLICT', () =>
    validateDirectCarAssignment(
      input({ driverAssignmentConflicts: [{ startAt: 'bad', endAt: 'also-bad' }] }),
    ),
  );
});

test('is deterministic and does not mutate caller input', () => {
  const candidate = input();
  const before = structuredClone(candidate);
  assert.deepEqual(validateDirectCarAssignment(candidate), validateDirectCarAssignment(candidate));
  assert.deepEqual(candidate, before);
});
