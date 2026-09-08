CREATE TABLE "HotelVendor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "vendorCode" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "tradingName" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
  "commercialNote" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelVendor_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelVendor_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelVendorEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelVendorEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "HotelVendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelVendorEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelVendorEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelVendor_propertyId_vendorCode_key" ON "HotelVendor"("propertyId", "vendorCode");
CREATE INDEX "HotelVendor_partnerId_status_updatedAt_idx" ON "HotelVendor"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelVendor_propertyId_category_status_idx" ON "HotelVendor"("propertyId", "category", "status");
CREATE UNIQUE INDEX "HotelVendorEvent_idempotencyKey_key" ON "HotelVendorEvent"("idempotencyKey");
CREATE UNIQUE INDEX "HotelVendorEvent_vendorId_version_key" ON "HotelVendorEvent"("vendorId", "version");
CREATE INDEX "HotelVendorEvent_partnerId_createdAt_idx" ON "HotelVendorEvent"("partnerId", "createdAt");
CREATE INDEX "HotelVendorEvent_propertyId_createdAt_idx" ON "HotelVendorEvent"("propertyId", "createdAt");
