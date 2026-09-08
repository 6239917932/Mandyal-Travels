ALTER TABLE "PartnerProperty" ADD COLUMN "operationalDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "operationalDateVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "HotelNightAuditClose" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "nextBusinessDate" TEXT NOT NULL,
    "closeNote" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "closedByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelNightAuditClose_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelNightAuditClose_idempotencyKey_key" ON "HotelNightAuditClose"("idempotencyKey");
CREATE UNIQUE INDEX "HotelNightAuditClose_propertyId_businessDate_key" ON "HotelNightAuditClose"("propertyId", "businessDate");
CREATE INDEX "HotelNightAuditClose_partnerId_closedAt_idx" ON "HotelNightAuditClose"("partnerId", "closedAt");
CREATE INDEX "HotelNightAuditClose_propertyId_closedAt_idx" ON "HotelNightAuditClose"("propertyId", "closedAt");

ALTER TABLE "HotelNightAuditClose" ADD CONSTRAINT "HotelNightAuditClose_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelNightAuditClose" ADD CONSTRAINT "HotelNightAuditClose_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
