CREATE TABLE "HotelPayrollRecord" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL,
  "deductionAmount" INTEGER NOT NULL DEFAULT 0,
  "netAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "note" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "reversedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" TIMESTAMP(3),
  CONSTRAINT "HotelPayrollRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerAccountingMapping" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "tallyLedgerName" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerAccountingMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelPayrollRecord_partnerId_memberId_period_revision_key" ON "HotelPayrollRecord"("partnerId", "memberId", "period", "revision");
CREATE INDEX "HotelPayrollRecord_partnerId_period_createdAt_idx" ON "HotelPayrollRecord"("partnerId", "period", "createdAt");
CREATE INDEX "HotelPayrollRecord_propertyId_period_createdAt_idx" ON "HotelPayrollRecord"("propertyId", "period", "createdAt");
CREATE UNIQUE INDEX "PartnerAccountingMapping_partnerId_propertyId_accountCode_key" ON "PartnerAccountingMapping"("partnerId", "propertyId", "accountCode");
CREATE INDEX "PartnerAccountingMapping_propertyId_updatedAt_idx" ON "PartnerAccountingMapping"("propertyId", "updatedAt");

ALTER TABLE "HotelPayrollRecord" ADD CONSTRAINT "HotelPayrollRecord_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelPayrollRecord" ADD CONSTRAINT "HotelPayrollRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelPayrollRecord" ADD CONSTRAINT "HotelPayrollRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SupplyPartnerMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerAccountingMapping" ADD CONSTRAINT "PartnerAccountingMapping_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerAccountingMapping" ADD CONSTRAINT "PartnerAccountingMapping_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
