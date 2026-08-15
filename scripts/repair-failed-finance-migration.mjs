import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

const migrationName = '20260815210000_add_finance_operations';
const databasePath = process.env.MANDYAL_SQLITE_DATABASE_PATH
  ? path.resolve(process.env.MANDYAL_SQLITE_DATABASE_PATH)
  : path.join(process.cwd(), 'prisma', 'dev.db');
const backupDirectory = process.env.MANDYAL_SQLITE_BACKUP_DIRECTORY
  ? path.resolve(process.env.MANDYAL_SQLITE_BACKUP_DIRECTORY)
  : path.join(process.cwd(), 'backups');

if (!fs.existsSync(databasePath)) {
  throw new Error(`Local SQLite database was not found at ${databasePath}.`);
}

fs.mkdirSync(backupDirectory, { recursive: true });

const backupPath = path.join(
  backupDirectory,
  `mandyal-before-finance-repair-${new Date().toISOString().replaceAll(':', '-')}.db`,
);

fs.copyFileSync(databasePath, backupPath, fs.constants.COPYFILE_EXCL);

const database = new Database(databasePath);

const quoteIdentifier = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

try {
  const migration = database
    .prepare(
      `SELECT "finished_at", "rolled_back_at"
       FROM "_prisma_migrations"
       WHERE "migration_name" = ?
       ORDER BY "started_at" DESC
       LIMIT 1`,
    )
    .get(migrationName);

  if (!migration) {
    throw new Error(`No local migration record exists for ${migrationName}.`);
  }

  if (migration.finished_at !== null) {
    console.log('Finance migration is already complete; no repair was required.');
    process.exitCode = 0;
  } else {
    const existingColumns = new Set(
      database.pragma('table_info(PaymentTransaction)').map((column) => column.name),
    );

    const requiredLegacyColumns = [
      'id',
      'bookingId',
      'status',
      'amount',
      'currency',
      'provider',
      'providerRef',
      'createdAt',
    ];

    const missingLegacyColumns = requiredLegacyColumns.filter(
      (column) => !existingColumns.has(column),
    );

    if (missingLegacyColumns.length > 0) {
      throw new Error(
        `PaymentTransaction is missing required columns: ${missingLegacyColumns.join(', ')}.`,
      );
    }

    const source = (column, fallback) =>
      existingColumns.has(column) ? quoteIdentifier(column) : fallback;

    database.pragma('foreign_keys = OFF');

    const repair = database.transaction(() => {
      database.exec(`
        DROP TABLE IF EXISTS "repair_PaymentTransaction";

        CREATE TABLE "repair_PaymentTransaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "bookingId" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "currency" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "providerRef" TEXT NOT NULL,
          "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNRECONCILED',
          "providerAmount" INTEGER,
          "providerCurrency" TEXT,
          "reconciliationNote" TEXT NOT NULL DEFAULT '',
          "reconciledAt" DATETIME,
          "reconciledByUserId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "PaymentTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        INSERT INTO "repair_PaymentTransaction" (
          "id",
          "bookingId",
          "status",
          "amount",
          "currency",
          "provider",
          "providerRef",
          "reconciliationStatus",
          "providerAmount",
          "providerCurrency",
          "reconciliationNote",
          "reconciledAt",
          "reconciledByUserId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          "id",
          "bookingId",
          "status",
          "amount",
          "currency",
          "provider",
          "providerRef",
          ${source('reconciliationStatus', "'UNRECONCILED'")},
          ${source('providerAmount', 'NULL')},
          ${source('providerCurrency', 'NULL')},
          ${source('reconciliationNote', "''")},
          ${source('reconciledAt', 'NULL')},
          ${source('reconciledByUserId', 'NULL')},
          "createdAt",
          ${source('updatedAt', '"createdAt"')}
        FROM "PaymentTransaction";

        DROP TABLE "PaymentTransaction";
        ALTER TABLE "repair_PaymentTransaction" RENAME TO "PaymentTransaction";

        CREATE UNIQUE INDEX "PaymentTransaction_bookingId_key" ON "PaymentTransaction"("bookingId");
        CREATE UNIQUE INDEX "PaymentTransaction_providerRef_key" ON "PaymentTransaction"("providerRef");

        CREATE TABLE IF NOT EXISTS "RefundRequest" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "bookingId" TEXT NOT NULL,
          "paymentId" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "currency" TEXT NOT NULL,
          "reason" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "providerRefundRef" TEXT,
          "requestedByUserId" TEXT,
          "reviewedByUserId" TEXT,
          "reviewNote" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reviewedAt" DATETIME,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RefundRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "RefundRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "FinancialLedgerEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "paymentId" TEXT,
          "refundId" TEXT,
          "entryType" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "currency" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'POSTED',
          "reference" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "createdByUserId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FinancialLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "FinancialLedgerEntry_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "RefundRequest_providerRefundRef_key" ON "RefundRequest"("providerRefundRef");
        CREATE INDEX IF NOT EXISTS "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");
        CREATE INDEX IF NOT EXISTS "RefundRequest_bookingId_createdAt_idx" ON "RefundRequest"("bookingId", "createdAt");
        CREATE INDEX IF NOT EXISTS "RefundRequest_paymentId_createdAt_idx" ON "RefundRequest"("paymentId", "createdAt");
        CREATE INDEX IF NOT EXISTS "FinancialLedgerEntry_entryType_createdAt_idx" ON "FinancialLedgerEntry"("entryType", "createdAt");
        CREATE INDEX IF NOT EXISTS "FinancialLedgerEntry_paymentId_createdAt_idx" ON "FinancialLedgerEntry"("paymentId", "createdAt");
        CREATE INDEX IF NOT EXISTS "FinancialLedgerEntry_refundId_createdAt_idx" ON "FinancialLedgerEntry"("refundId", "createdAt");
        CREATE INDEX IF NOT EXISTS "PaymentTransaction_reconciliationStatus_createdAt_idx" ON "PaymentTransaction"("reconciliationStatus", "createdAt");
        CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");
      `);

      const foreignKeyIssues = database.pragma('foreign_key_check');

      if (foreignKeyIssues.length > 0) {
        throw new Error(`Finance repair found ${foreignKeyIssues.length} foreign-key issue(s).`);
      }
    });

    repair();
    database.pragma('foreign_keys = ON');

    console.log('Finance tables were repaired without deleting payment records.');
    console.log(`Safety backup: ${backupPath}`);
    console.log(`Next: npx prisma migrate resolve --applied ${migrationName}`);
  }
} finally {
  database.close();
}
