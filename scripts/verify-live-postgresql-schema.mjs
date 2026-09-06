import process from 'node:process';
import pg from 'pg';

import { postgreSqlClientOptions } from './lib/postgresql-client-options.mjs';

const databaseUrl = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!databaseUrl?.startsWith('postgresql://') && !databaseUrl?.startsWith('postgres://')) {
  console.error('A PostgreSQL DATABASE_URL or DIRECT_DATABASE_URL is required.');
  process.exit(1);
}

const requiredColumns = new Map([
  ['SupplyPartner', ['payoutDestinationVersion']],
  [
    'PartnerAgreementVersion',
    ['content', 'governanceVersion', 'approvedAt', 'retiredAt', 'updatedAt'],
  ],
  ['PartnerPayoutAccount', ['version', 'reviewReason', 'reviewedByUserId', 'reviewedAt']],
  [
    'EmailOtpChallenge',
    ['id', 'userId', 'purpose', 'codeHash', 'expiresAt', 'attempts', 'consumedAt', 'createdAt'],
  ],
  [
    'PartnerAgreementVersionEvent',
    ['id', 'agreementVersionId', 'actorUserId', 'action', 'version', 'createdAt'],
  ],
  [
    'PartnerAgreementRelease',
    ['key', 'agreementVersionId', 'version', 'updatedByUserId', 'createdAt', 'updatedAt'],
  ],
  [
    'PartnerOnboardingCouponEvent',
    ['id', 'couponId', 'actorUserId', 'action', 'version', 'createdAt'],
  ],
  [
    'PartnerPayoutAccountEvent',
    ['id', 'payoutAccountId', 'actorUserId', 'action', 'version', 'createdAt'],
  ],
]);

const client = new pg.Client(postgreSqlClientOptions(databaseUrl));

try {
  await client.connect();
  const { rows } = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])`,
    [[...requiredColumns.keys()]],
  );
  const observed = new Map();
  for (const row of rows) {
    const columns = observed.get(row.table_name) ?? new Set();
    columns.add(row.column_name);
    observed.set(row.table_name, columns);
  }

  const missing = [];
  for (const [table, columns] of requiredColumns) {
    if (!observed.has(table)) {
      missing.push(`table ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!observed.get(table).has(column)) missing.push(`column ${table}.${column}`);
    }
  }

  if (missing.length) {
    console.error('PostgreSQL schema verification failed:');
    for (const item of missing) console.error(`- Missing ${item}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Verified ${requiredColumns.size} critical PostgreSQL tables and their current application columns.`,
    );
  }
} catch (error) {
  console.error('Unable to verify the live PostgreSQL schema.', error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
