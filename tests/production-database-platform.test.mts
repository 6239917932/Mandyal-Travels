import assert from 'node:assert/strict';
import test from 'node:test';

import {
  baselineChecksum,
  compareDatabaseSnapshots,
  extractCanonicalTableNames,
  quoteDatabaseIdentifier,
} from '../scripts/lib/postgresql-cutover.mjs';
import { validateProductionDatabaseContract } from '../scripts/lib/production-database-contract.mjs';

const validEnvironment = {
  DATABASE_BACKUP_POLICY_ID: 'backup-policy-2026',
  DATABASE_CUTOVER_PLAN_ID: 'cutover-plan-2026',
  DATABASE_HIGH_AVAILABILITY: 'true',
  DATABASE_PITR_ENABLED: 'true',
  DATABASE_PLATFORM_PROVIDER: 'approved-managed-postgresql',
  DATABASE_PLATFORM_REGION: 'india-west-1',
  DATABASE_RESTORE_EVIDENCE_ID: 'restore-test-2026',
  DATABASE_URL:
    'postgresql://mandyal_app:runtime-secret@pool.db.vendor.test/mandyal?sslmode=verify-full',
  DIRECT_DATABASE_URL:
    'postgresql://mandyal_migrate:migration-secret@direct.db.vendor.test/mandyal?sslmode=verify-full',
};

test('managed PostgreSQL release contract requires isolated TLS identities and recovery evidence', () => {
  assert.deepEqual(validateProductionDatabaseContract(validEnvironment), []);
  assert.match(
    validateProductionDatabaseContract({
      ...validEnvironment,
      DIRECT_DATABASE_URL: validEnvironment.DATABASE_URL,
    }).join('\n'),
    /separate identities|must be different/,
  );
  assert.match(
    validateProductionDatabaseContract({
      ...validEnvironment,
      DATABASE_URL: 'postgresql://mandyal_app:secret@db.vendor.test/mandyal',
    }).join('\n'),
    /verified TLS/,
  );
});

test('cutover evidence extracts canonical tables and produces stable baseline checksums', () => {
  const baseline = 'CREATE TABLE "User" ();\r\nCREATE TABLE "Booking" ();\r\n';
  assert.deepEqual(extractCanonicalTableNames(baseline), ['User', 'Booking']);
  assert.equal(baselineChecksum(baseline), baselineChecksum(baseline.replaceAll('\r\n', '\n')));
  assert.equal(quoteDatabaseIdentifier('PaymentTransaction'), '"PaymentTransaction"');
  assert.throws(() => quoteDatabaseIdentifier('User; DROP TABLE User'));
});

test('cutover reconciliation reports table and financial mismatches without record contents', () => {
  assert.deepEqual(
    compareDatabaseSnapshots(
      { financial: { 'PaymentTransaction.amount': '100' }, tables: { Booking: 2, User: 1 } },
      { financial: { 'PaymentTransaction.amount': '99' }, tables: { Booking: 1, User: 1 } },
    ),
    [
      { key: 'table:Booking', source: 2, target: 1 },
      { key: 'financial:PaymentTransaction.amount', source: '100', target: '99' },
    ],
  );
});
