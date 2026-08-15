import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

const migrationRoot = path.join(process.cwd(), 'prisma', 'migrations');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mandyal-migrations-'));
const databasePath = path.join(temporaryDirectory, 'verification.db');
const database = new Database(databasePath);
const populatedMigration = '20260815210000_add_finance_operations';
const legacyPaymentId = 'migration-verification-payment';
const legacyCreatedAt = '2026-08-15T00:00:00.000Z';

try {
  const migrationDirectories = fs
    .readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let appliedMigrations = 0;

  for (const migrationDirectory of migrationDirectories) {
    const migrationPath = path.join(migrationRoot, migrationDirectory, 'migration.sql');

    if (!fs.existsSync(migrationPath)) {
      continue;
    }

    if (migrationDirectory === populatedMigration) {
      database.pragma('foreign_keys = OFF');
      database
        .prepare(
          `INSERT INTO "PaymentTransaction" (
            "id",
            "bookingId",
            "status",
            "amount",
            "currency",
            "provider",
            "providerRef",
            "createdAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          legacyPaymentId,
          'migration-verification-booking',
          'CAPTURED',
          12500,
          'INR',
          'verification-provider',
          'verification-provider-reference',
          legacyCreatedAt,
        );
      database.pragma('foreign_keys = ON');
    }

    database.exec(fs.readFileSync(migrationPath, 'utf8'));
    appliedMigrations += 1;

    if (migrationDirectory === populatedMigration) {
      const migratedPayment = database
        .prepare(
          `SELECT
            "id",
            "amount",
            "reconciliationStatus",
            "reconciliationNote",
            "createdAt",
            "updatedAt"
          FROM "PaymentTransaction"
          WHERE "id" = ?`,
        )
        .get(legacyPaymentId);

      if (
        migratedPayment?.amount !== 12500 ||
        migratedPayment.reconciliationStatus !== 'UNRECONCILED' ||
        migratedPayment.reconciliationNote !== '' ||
        migratedPayment.createdAt !== legacyCreatedAt ||
        migratedPayment.updatedAt !== legacyCreatedAt
      ) {
        throw new Error('Finance migration did not preserve the populated payment record.');
      }

      database.pragma('foreign_keys = OFF');
      database.prepare('DELETE FROM "PaymentTransaction" WHERE "id" = ?').run(legacyPaymentId);
      database.pragma('foreign_keys = ON');
    }
  }

  if (appliedMigrations === 0) {
    throw new Error('No database migrations were found.');
  }

  const foreignKeyIssues = database.pragma('foreign_key_check');
  const integrityResult = database.pragma('integrity_check', { simple: true });

  if (foreignKeyIssues.length > 0) {
    throw new Error(
      `Migration verification found ${foreignKeyIssues.length} foreign-key issue(s).`,
    );
  }

  if (integrityResult !== 'ok') {
    throw new Error(`Migration verification failed the SQLite integrity check: ${integrityResult}`);
  }

  console.log(
    `Verified ${appliedMigrations} database migrations, including populated legacy payment data.`,
  );
} finally {
  database.close();
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}
