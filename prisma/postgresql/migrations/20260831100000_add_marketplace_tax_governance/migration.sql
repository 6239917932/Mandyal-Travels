ALTER TABLE "SupplyPartner" ALTER COLUMN "commissionBasisPoints" SET DEFAULT 2000;
UPDATE "SupplyPartner" SET "commissionBasisPoints" = 2000;

CREATE TABLE "PartnerTaxProfile" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "gstRegistrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "gstin" TEXT NOT NULL DEFAULT '',
  "placeOfSupplyStateCode" TEXT NOT NULL DEFAULT '',
  "section9FiveApplicable" BOOLEAN NOT NULL DEFAULT false,
  "section194OExempt" BOOLEAN NOT NULL DEFAULT false,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "effectiveFrom" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerTaxProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnerTaxProfile_partnerId_key" ON "PartnerTaxProfile"("partnerId");
CREATE INDEX "PartnerTaxProfile_reviewStatus_gstRegistrationStatus_updatedAt_idx" ON "PartnerTaxProfile"("reviewStatus", "gstRegistrationStatus", "updatedAt");

CREATE TABLE "MarketplaceTaxSnapshot" (
  "id" TEXT NOT NULL,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceTaxSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceTaxSnapshot_bookingId_key" ON "MarketplaceTaxSnapshot"("bookingId");
CREATE INDEX "MarketplaceTaxSnapshot_partnerId_createdAt_idx" ON "MarketplaceTaxSnapshot"("partnerId", "createdAt");
CREATE INDEX "MarketplaceTaxSnapshot_ruleVersion_createdAt_idx" ON "MarketplaceTaxSnapshot"("ruleVersion", "createdAt");

ALTER TABLE "PartnerTaxProfile" ADD CONSTRAINT "PartnerTaxProfile_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTaxSnapshot" ADD CONSTRAINT "MarketplaceTaxSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTaxSnapshot" ADD CONSTRAINT "MarketplaceTaxSnapshot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
