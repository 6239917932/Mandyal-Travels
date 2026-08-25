import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import 'dotenv/config';
import pg from 'pg';

import {
  baselineChecksum,
  compareDatabaseSnapshots,
  extractCanonicalTableNames,
  FINANCIAL_RECONCILIATION_FIELDS,
  quoteDatabaseIdentifier,
} from './lib/postgresql-cutover.mjs';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='));
const mode = modeArgument?.slice('--mode='.length) ?? 'preflight';
if (!['preflight', 'reconcile', 'restore'].includes(mode)) {
  throw new Error('CUTOVER_MODE_INVALID');
}

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
if (!sourceUrl.startsWith('file:')) throw new Error('SOURCE_DATABASE_URL_MUST_USE_SQLITE');
const sourcePath = path.resolve(root, sourceUrl.slice('file:'.length));
const targetUrl =
  mode === 'restore' ? process.env.RESTORE_DATABASE_URL : process.env.DIRECT_DATABASE_URL;
if (!targetUrl) {
  throw new Error(
    mode === 'restore' ? 'RESTORE_DATABASE_URL_REQUIRED' : 'DIRECT_DATABASE_URL_REQUIRED',
  );
}
if (!/^postgres(?:ql)?:\/\//i.test(targetUrl))
  throw new Error('TARGET_DATABASE_MUST_USE_POSTGRESQL');
if (
  mode === 'restore' &&
  [process.env.DATABASE_URL, process.env.DIRECT_DATABASE_URL].some(
    (configuredUrl) => configuredUrl && configuredUrl === targetUrl,
  )
) {
  throw new Error('RESTORE_DATABASE_MUST_BE_ISOLATED');
}

const baselineSql = await readFile(
  path.join(root, 'prisma', 'postgresql', 'migrations', '00000000000000_baseline', 'migration.sql'),
  'utf8',
);
const canonicalTables = extractCanonicalTableNames(baselineSql);

function readSqliteSnapshot() {
  const database = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error('SOURCE_SQLITE_INTEGRITY_FAILED');
    const foreignKeyFailures = database.pragma('foreign_key_check');
    if (foreignKeyFailures.length) throw new Error('SOURCE_SQLITE_FOREIGN_KEYS_FAILED');
    const tables = {};
    const financial = {};
    for (const table of canonicalTables) {
      const identifier = quoteDatabaseIdentifier(table);
      const row = database.prepare(`SELECT COUNT(*) AS value FROM ${identifier}`).get();
      tables[table] = Number(row.value);
    }
    for (const [table, fields] of Object.entries(FINANCIAL_RECONCILIATION_FIELDS)) {
      for (const field of fields) {
        const row = database
          .prepare(
            `SELECT CAST(COALESCE(SUM(${quoteDatabaseIdentifier(field)}), 0) AS TEXT) AS value FROM ${quoteDatabaseIdentifier(table)}`,
          )
          .get();
        financial[`${table}.${field}`] = String(row.value);
      }
    }
    return { financial, foreignKeyFailures: 0, integrity: 'ok', tables };
  } finally {
    database.close();
  }
}

async function readPostgreSqlSnapshot() {
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  try {
    const tableResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    const availableTables = new Set(tableResult.rows.map((row) => row.table_name));
    for (const table of [...canonicalTables, '_prisma_migrations']) {
      if (!availableTables.has(table)) throw new Error(`TARGET_TABLE_MISSING:${table}`);
    }
    const expectedTables = new Set([...canonicalTables, '_prisma_migrations']);
    const unexpectedTables = [...availableTables].filter((table) => !expectedTables.has(table));
    if (unexpectedTables.length) throw new Error('TARGET_DATABASE_CONTAINS_UNEXPECTED_TABLES');
    const migrationState = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS completed,
         COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed
       FROM "_prisma_migrations"`,
    );
    if (Number(migrationState.rows[0]?.completed ?? 0) < 1) {
      throw new Error('TARGET_MIGRATION_NOT_COMPLETED');
    }
    if (Number(migrationState.rows[0]?.failed ?? 0) !== 0) {
      throw new Error('TARGET_MIGRATION_FAILED');
    }
    const invalidConstraints = await client.query(
      `SELECT COUNT(*)::int AS value
       FROM pg_constraint AS constraint_record
       INNER JOIN pg_namespace AS namespace
         ON namespace.oid = constraint_record.connamespace
       WHERE namespace.nspname = 'public'
         AND constraint_record.contype = 'f'
         AND NOT constraint_record.convalidated`,
    );
    if (Number(invalidConstraints.rows[0]?.value ?? 0) !== 0) {
      throw new Error('TARGET_FOREIGN_KEYS_NOT_VALIDATED');
    }
    const tables = {};
    const financial = {};
    for (const table of canonicalTables) {
      const result = await client.query(
        `SELECT COUNT(*)::int AS value FROM ${quoteDatabaseIdentifier(table)}`,
      );
      tables[table] = Number(result.rows[0]?.value ?? 0);
    }
    for (const [table, fields] of Object.entries(FINANCIAL_RECONCILIATION_FIELDS)) {
      for (const field of fields) {
        const result = await client.query(
          `SELECT CAST(COALESCE(SUM(${quoteDatabaseIdentifier(field)}), 0) AS TEXT) AS value FROM ${quoteDatabaseIdentifier(table)}`,
        );
        financial[`${table}.${field}`] = String(result.rows[0]?.value ?? '0');
      }
    }
    return { financial, foreignKeyFailures: 0, integrity: 'constraints-validated', tables };
  } finally {
    await client.end();
  }
}

const source = readSqliteSnapshot();
const target = await readPostgreSqlSnapshot();
const mismatches = compareDatabaseSnapshots(source, target);
if (mode === 'preflight') {
  const populatedTables = Object.entries(target.tables).filter(([, count]) => count !== 0);
  if (populatedTables.length) throw new Error('TARGET_DATABASE_NOT_EMPTY');
} else if (mismatches.length) {
  throw new Error(`DATABASE_RECONCILIATION_FAILED:${JSON.stringify(mismatches)}`);
}

const evidence = {
  baselineSha256: baselineChecksum(baselineSql),
  canonicalTableCount: canonicalTables.length,
  financialMetricCount: Object.keys(source.financial).length,
  mismatchCount: mode === 'preflight' ? null : mismatches.length,
  mode,
  source: {
    financial: source.financial,
    foreignKeyFailures: source.foreignKeyFailures,
    integrity: source.integrity,
    tables: source.tables,
  },
  target: {
    financial: target.financial,
    foreignKeyFailures: target.foreignKeyFailures,
    integrity: target.integrity,
    tables: target.tables,
  },
  verifiedAt: new Date().toISOString(),
};

if (process.env.CUTOVER_EVIDENCE_PATH) {
  const evidencePath = path.resolve(root, process.env.CUTOVER_EVIDENCE_PATH);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
}

console.log(JSON.stringify(evidence, null, 2));
console.log(`PostgreSQL ${mode} verification passed without changing either database.`);
