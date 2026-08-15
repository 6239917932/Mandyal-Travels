ALTER TABLE "PaymentTransaction" ADD COLUMN "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNRECONCILED';
ALTER TABLE "PaymentTransaction" ADD COLUMN "providerAmount" INTEGER;
ALTER TABLE "PaymentTransaction" ADD COLUMN "providerCurrency" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "reconciliationNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentTransaction" ADD COLUMN "reconciledAt" DATETIME;
ALTER TABLE "PaymentTransaction" ADD COLUMN "reconciledByUserId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

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
