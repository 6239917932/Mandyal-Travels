import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeVehicleComplianceDates, vehicleComplianceState } from '../lib/car/complianceRules.ts';

const complete = { fitnessExpiry: '2027-06-01', insuranceExpiry: '2027-07-01', permitExpiry: '2027-08-01', pollutionExpiry: '2027-09-01', registrationExpiry: '2030-01-01' };
test('vehicle compliance normalizes valid optional expiry dates', () => { assert.equal(normalizeVehicleComplianceDates({ ...complete, insuranceExpiry: ' 2027-07-01 ' }).insuranceExpiry, '2027-07-01'); assert.throws(() => normalizeVehicleComplianceDates({ ...complete, permitExpiry: '2027-02-30' })); });
test('vehicle compliance reports incomplete, expired, expiring, and complete states', () => { assert.equal(vehicleComplianceState({ ...complete, permitExpiry: '' }, '2026-08-15'), 'INCOMPLETE'); assert.equal(vehicleComplianceState({ ...complete, permitExpiry: '2026-08-14' }, '2026-08-15'), 'EXPIRED'); assert.equal(vehicleComplianceState({ ...complete, permitExpiry: '2026-09-01' }, '2026-08-15'), 'EXPIRING'); assert.equal(vehicleComplianceState(complete, '2026-08-15'), 'COMPLETE'); });
