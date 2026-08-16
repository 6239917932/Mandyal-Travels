ALTER TABLE "SupplyPartner" ADD COLUMN "commissionBasisPoints" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "SupplyPartner" ADD COLUMN "settlementDelayDays" INTEGER NOT NULL DEFAULT 2;

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
  "checkoutIntentId" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNRECONCILED',
  "providerAmount" INTEGER,
  "providerCurrency" TEXT,
  "reconciliationNote" TEXT NOT NULL DEFAULT '',
  "reconciledAt" DATETIME,
  "reconciledByUserId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PaymentTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentTransaction_checkoutIntentId_fkey" FOREIGN KEY ("checkoutIntentId") REFERENCES "PaymentCheckoutIntent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PaymentTransaction" (
  "amount", "bookingId", "createdAt", "currency", "id", "provider", "providerAmount",
  "providerCurrency", "providerRef", "reconciledAt", "reconciledByUserId", "reconciliationNote",
  "reconciliationStatus", "status", "updatedAt"
) SELECT
  "amount", "bookingId", "createdAt", "currency", "id", "provider", "providerAmount",
  "providerCurrency", "providerRef", "reconciledAt", "reconciledByUserId", "reconciliationNote",
  "reconciliationStatus", "status", "updatedAt"
FROM "PaymentTransaction";
DROP TABLE "PaymentTransaction";
ALTER TABLE "new_PaymentTransaction" RENAME TO "PaymentTransaction";
CREATE UNIQUE INDEX "PaymentTransaction_bookingId_key" ON "PaymentTransaction"("bookingId");
CREATE UNIQUE INDEX "PaymentTransaction_providerRef_key" ON "PaymentTransaction"("providerRef");
CREATE UNIQUE INDEX "PaymentTransaction_checkoutIntentId_key" ON "PaymentTransaction"("checkoutIntentId");
CREATE INDEX "PaymentTransaction_reconciliationStatus_createdAt_idx" ON "PaymentTransaction"("reconciliationStatus", "createdAt");
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "PaymentAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "partnerId" TEXT,
  "allocationKey" TEXT NOT NULL,
  "allocationType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_allocationKey_key" ON "PaymentAllocation"("paymentId", "allocationKey");
CREATE INDEX "PaymentAllocation_partnerId_allocationType_createdAt_idx" ON "PaymentAllocation"("partnerId", "allocationType", "createdAt");
CREATE INDEX "PaymentAllocation_paymentId_status_idx" ON "PaymentAllocation"("paymentId", "status");

CREATE TABLE "FinancialJournal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reference" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "paymentId" TEXT,
  "refundId" TEXT,
  "currency" TEXT NOT NULL,
  "totalDebit" INTEGER NOT NULL,
  "totalCredit" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "description" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialJournal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FinancialJournal_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialJournal_reference_key" ON "FinancialJournal"("reference");
CREATE UNIQUE INDEX "FinancialJournal_sourceType_sourceId_key" ON "FinancialJournal"("sourceType", "sourceId");
CREATE INDEX "FinancialJournal_paymentId_createdAt_idx" ON "FinancialJournal"("paymentId", "createdAt");
CREATE INDEX "FinancialJournal_refundId_createdAt_idx" ON "FinancialJournal"("refundId", "createdAt");
CREATE INDEX "FinancialJournal_status_createdAt_idx" ON "FinancialJournal"("status", "createdAt");

CREATE TABLE "FinancialJournalPosting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "journalId" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "partnerId" TEXT,
  "description" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialJournalPosting_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "FinancialJournal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "FinancialJournalPosting_journalId_direction_idx" ON "FinancialJournalPosting"("journalId", "direction");
CREATE INDEX "FinancialJournalPosting_accountCode_createdAt_idx" ON "FinancialJournalPosting"("accountCode", "createdAt");
CREATE INDEX "FinancialJournalPosting_partnerId_accountCode_createdAt_idx" ON "FinancialJournalPosting"("partnerId", "accountCode", "createdAt");

CREATE TABLE "PartnerSettlementLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "settlementId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "bookingId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL,
  "commissionAmount" INTEGER NOT NULL,
  "taxWithheldAmount" INTEGER NOT NULL DEFAULT 0,
  "adjustmentAmount" INTEGER NOT NULL DEFAULT 0,
  "netAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "eligibleAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerSettlementLine_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerSettlementLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerSettlementLine_bookingId_key" ON "PartnerSettlementLine"("bookingId");
CREATE UNIQUE INDEX "PartnerSettlementLine_sourceType_sourceId_key" ON "PartnerSettlementLine"("sourceType", "sourceId");
CREATE INDEX "PartnerSettlementLine_settlementId_createdAt_idx" ON "PartnerSettlementLine"("settlementId", "createdAt");
CREATE INDEX "PartnerSettlementLine_partnerId_eligibleAt_idx" ON "PartnerSettlementLine"("partnerId", "eligibleAt");

CREATE TABLE "PartnerPayoutAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerBeneficiaryRef" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountLast4" TEXT NOT NULL,
  "routingCodeMasked" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerPayoutAccount_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerPayoutAccount_providerBeneficiaryRef_key" ON "PartnerPayoutAccount"("providerBeneficiaryRef");
CREATE INDEX "PartnerPayoutAccount_partnerId_status_isDefault_idx" ON "PartnerPayoutAccount"("partnerId", "status", "isDefault");

CREATE TABLE "PartnerPayoutBatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "instructionCount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "providerBatchRef" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" DATETIME,
  "submittedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PartnerPayoutBatch_idempotencyKey_key" ON "PartnerPayoutBatch"("idempotencyKey");
CREATE UNIQUE INDEX "PartnerPayoutBatch_providerBatchRef_key" ON "PartnerPayoutBatch"("providerBatchRef");
CREATE INDEX "PartnerPayoutBatch_status_createdAt_idx" ON "PartnerPayoutBatch"("status", "createdAt");

CREATE TABLE "PartnerPayoutInstruction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "payoutAccountId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "providerPayoutRef" TEXT,
  "failureCode" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerPayoutInstruction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PartnerPayoutBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerPayoutInstruction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerPayoutInstruction_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "PartnerPayoutAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerPayoutInstruction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerPayoutInstruction_settlementId_key" ON "PartnerPayoutInstruction"("settlementId");
CREATE UNIQUE INDEX "PartnerPayoutInstruction_providerPayoutRef_key" ON "PartnerPayoutInstruction"("providerPayoutRef");
CREATE INDEX "PartnerPayoutInstruction_batchId_status_idx" ON "PartnerPayoutInstruction"("batchId", "status");
CREATE INDEX "PartnerPayoutInstruction_partnerId_status_createdAt_idx" ON "PartnerPayoutInstruction"("partnerId", "status", "createdAt");
