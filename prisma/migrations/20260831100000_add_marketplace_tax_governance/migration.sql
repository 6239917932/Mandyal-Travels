PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SupplyPartner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'HOTEL',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "commissionBasisPoints" INTEGER NOT NULL DEFAULT 2000,
  "settlementDelayDays" INTEGER NOT NULL DEFAULT 2,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SupplyPartner" SELECT "id", "name", "type", "status", "contactEmail", "contactPhone", 2000, "settlementDelayDays", "createdAt", "updatedAt" FROM "SupplyPartner";
DROP TABLE "SupplyPartner";
ALTER TABLE "new_SupplyPartner" RENAME TO "SupplyPartner";
CREATE INDEX "SupplyPartner_status_createdAt_idx" ON "SupplyPartner"("status", "createdAt");

CREATE TABLE "PartnerTaxProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "gstRegistrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "gstin" TEXT NOT NULL DEFAULT '',
  "placeOfSupplyStateCode" TEXT NOT NULL DEFAULT '',
  "section9FiveApplicable" BOOLEAN NOT NULL DEFAULT false,
  "section194OExempt" BOOLEAN NOT NULL DEFAULT false,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "effectiveFrom" DATETIME,
  "reviewedAt" DATETIME,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerTaxProfile_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerTaxProfile_partnerId_key" ON "PartnerTaxProfile"("partnerId");
CREATE INDEX "PartnerTaxProfile_reviewStatus_gstRegistrationStatus_updatedAt_idx" ON "PartnerTaxProfile"("reviewStatus", "gstRegistrationStatus", "updatedAt");

CREATE TABLE "MarketplaceTaxSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "ruleVersion" TEXT NOT NULL,
  "supplyType" TEXT NOT NULL DEFAULT 'HOTEL_ACCOMMODATION',
  "vendorGstRegistered" BOOLEAN NOT NULL,
  "vendorBaseAmount" INTEGER NOT NULL,
  "customerTaxableAmount" INTEGER NOT NULL,
  "serviceGstAmount" INTEGER NOT NULL,
  "customerTotalAmount" INTEGER NOT NULL,
  "commissionGrossAmount" INTEGER NOT NULL,
  "commissionTaxableAmount" INTEGER NOT NULL,
  "commissionGstAmount" INTEGER NOT NULL,
  "gstTcsAmount" INTEGER NOT NULL DEFAULT 0,
  "incomeTaxTdsAmount" INTEGER NOT NULL DEFAULT 0,
  "gatewayFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "gatewayFeeGstAmount" INTEGER NOT NULL DEFAULT 0,
  "vendorSettlementAmount" INTEGER NOT NULL,
  "platformContributionAmount" INTEGER NOT NULL,
  "ecoGstLiabilityAmount" INTEGER NOT NULL DEFAULT 0,
  "calculationJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceTaxSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MarketplaceTaxSnapshot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MarketplaceTaxSnapshot_bookingId_key" ON "MarketplaceTaxSnapshot"("bookingId");
CREATE INDEX "MarketplaceTaxSnapshot_partnerId_createdAt_idx" ON "MarketplaceTaxSnapshot"("partnerId", "createdAt");
CREATE INDEX "MarketplaceTaxSnapshot_ruleVersion_createdAt_idx" ON "MarketplaceTaxSnapshot"("ruleVersion", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
