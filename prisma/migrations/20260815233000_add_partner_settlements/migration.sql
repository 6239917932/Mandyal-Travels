CREATE TABLE "PartnerSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "grossAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "taxWithheldAmount" INTEGER NOT NULL DEFAULT 0,
    "adjustmentAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "bookingCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "calculationJson" TEXT NOT NULL DEFAULT '{}',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "approvedByUserId" TEXT,
    "approvedAt" DATETIME,
    "paidAt" DATETIME,
    "paymentReference" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerSettlement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerSettlement_partnerId_periodStart_periodEnd_key" ON "PartnerSettlement"("partnerId", "periodStart", "periodEnd");
CREATE INDEX "PartnerSettlement_status_periodEnd_createdAt_idx" ON "PartnerSettlement"("status", "periodEnd", "createdAt");
CREATE INDEX "PartnerSettlement_partnerId_status_periodEnd_idx" ON "PartnerSettlement"("partnerId", "status", "periodEnd");
