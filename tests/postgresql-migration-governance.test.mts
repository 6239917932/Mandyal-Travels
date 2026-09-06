import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (relativePath: string) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('the applied PostgreSQL baseline is immutable and schema changes require migrations', async () => {
  const sync = await read('scripts/sync-postgresql-contract.mjs');

  assert.match(sync, /expectedBaselineSha256/);
  assert.match(sync, /createHash\('sha256'\)/);
  assert.match(sync, /add a new incremental migration instead/);
  assert.doesNotMatch(sync, /writeFileSync\(baselinePath/);
});

test('the convergence migration repairs the production schema idempotently', async () => {
  const migration = await read(
    'prisma/postgresql/migrations/20260906180000_converge_postgresql_schema_after_baseline/migration.sql',
  );

  assert.match(migration, /ADD COLUMN IF NOT EXISTS "payoutDestinationVersion"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "EmailOtpChallenge"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "PartnerAgreementVersionEvent"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "PartnerAgreementRelease"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "PartnerOnboardingCouponEvent"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "PartnerPayoutAccountEvent"/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS/);
  assert.match(migration, /FROM pg_constraint/);
});

test('CI deploys and inspects migrations against PostgreSQL', async () => {
  const workflow = await read('.github/workflows/portal-quality.yml');
  const verifier = await read('scripts/verify-live-postgresql-schema.mjs');

  assert.match(workflow, /postgresql:/);
  assert.match(workflow, /image: postgres:18/);
  assert.match(workflow, /npm run db:deploy:postgresql/);
  assert.match(workflow, /npm run db:verify:postgresql:live/);
  assert.match(verifier, /information_schema\.columns/);
  assert.doesNotMatch(verifier, /console\.log\([^)]*databaseUrl/);
});
