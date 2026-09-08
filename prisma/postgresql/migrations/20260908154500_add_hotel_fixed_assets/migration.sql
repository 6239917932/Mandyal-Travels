CREATE TABLE "HotelFixedAsset" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "assetTag" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "custodian" TEXT NOT NULL DEFAULT '',
  "acquiredOn" TEXT NOT NULL,
  "acquisitionCostMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "invoiceReference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastVerifiedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelFixedAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelFixedAssetEvent" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "resultingStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelFixedAssetEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelFixedAsset_propertyId_assetTag_key" ON "HotelFixedAsset"("propertyId", "assetTag");
CREATE INDEX "HotelFixedAsset_partnerId_status_updatedAt_idx" ON "HotelFixedAsset"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelFixedAsset_propertyId_category_status_idx" ON "HotelFixedAsset"("propertyId", "category", "status");
CREATE UNIQUE INDEX "HotelFixedAssetEvent_idempotencyKey_key" ON "HotelFixedAssetEvent"("idempotencyKey");
CREATE INDEX "HotelFixedAssetEvent_assetId_createdAt_idx" ON "HotelFixedAssetEvent"("assetId", "createdAt");
CREATE INDEX "HotelFixedAssetEvent_partnerId_createdAt_idx" ON "HotelFixedAssetEvent"("partnerId", "createdAt");
CREATE INDEX "HotelFixedAssetEvent_propertyId_createdAt_idx" ON "HotelFixedAssetEvent"("propertyId", "createdAt");

ALTER TABLE "HotelFixedAsset" ADD CONSTRAINT "HotelFixedAsset_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelFixedAsset" ADD CONSTRAINT "HotelFixedAsset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelFixedAssetEvent" ADD CONSTRAINT "HotelFixedAssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "HotelFixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelFixedAssetEvent" ADD CONSTRAINT "HotelFixedAssetEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelFixedAssetEvent" ADD CONSTRAINT "HotelFixedAssetEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
