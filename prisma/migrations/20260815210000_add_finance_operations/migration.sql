PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PaymentTransaction" (
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

INSERT INTO "new_PaymentTransaction" (
  "id",
  "bookingId",
  "status",
  "amount",
  "currency",
  "provider",
  "providerRef",
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
  "createdAt",
  "createdAt"
FROM "PaymentTransaction";

DROP TABLE "PaymentTransaction";
ALTER TABLE "new_PaymentTransaction" RENAME TO "PaymentTransaction";

CREATE UNIQUE INDEX "PaymentTransaction_bookingId_key" ON "PaymentTransaction"("bookingId");
CREATE UNIQUE INDEX "PaymentTransaction_providerRef_key" ON "PaymentTransaction"("providerRef");

PRAGMA foreign_keys=ON;

CREATE TABLE "RefundRequest" (
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

CREATE TABLE "FinancialLedgerEntry" (
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

CREATE UNIQUE INDEX "RefundRequest_providerRefundRef_key" ON "RefundRequest"("providerRefundRef");
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");
CREATE INDEX "RefundRequest_bookingId_createdAt_idx" ON "RefundRequest"("bookingId", "createdAt");
CREATE INDEX "RefundRequest_paymentId_createdAt_idx" ON "RefundRequest"("paymentId", "createdAt");
CREATE INDEX "FinancialLedgerEntry_entryType_createdAt_idx" ON "FinancialLedgerEntry"("entryType", "createdAt");
CREATE INDEX "FinancialLedgerEntry_paymentId_createdAt_idx" ON "FinancialLedgerEntry"("paymentId", "createdAt");
CREATE INDEX "FinancialLedgerEntry_refundId_createdAt_idx" ON "FinancialLedgerEntry"("refundId", "createdAt");
CREATE INDEX "PaymentTransaction_reconciliationStatus_createdAt_idx" ON "PaymentTransaction"("reconciliationStatus", "createdAt");
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");
