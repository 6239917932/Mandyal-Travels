CREATE TABLE "HotelLostFoundItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "foundLocation" TEXT NOT NULL,
  "storageLocation" TEXT NOT NULL,
  "foundOn" TEXT NOT NULL,
  "foundBy" TEXT NOT NULL,
  "reservationReference" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'IN_CUSTODY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelLostFoundItem_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelLostFoundItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelLostFoundEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "releasedTo" TEXT NOT NULL DEFAULT '',
  "releaseEvidenceReference" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelLostFoundEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HotelLostFoundItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelLostFoundEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelLostFoundEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelLostFoundItem_propertyId_referenceCode_key" ON "HotelLostFoundItem"("propertyId", "referenceCode");
CREATE INDEX "HotelLostFoundItem_partnerId_status_updatedAt_idx" ON "HotelLostFoundItem"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelLostFoundItem_propertyId_foundOn_status_idx" ON "HotelLostFoundItem"("propertyId", "foundOn", "status");
CREATE UNIQUE INDEX "HotelLostFoundEvent_idempotencyKey_key" ON "HotelLostFoundEvent"("idempotencyKey");
CREATE UNIQUE INDEX "HotelLostFoundEvent_itemId_version_key" ON "HotelLostFoundEvent"("itemId", "version");
CREATE INDEX "HotelLostFoundEvent_partnerId_createdAt_idx" ON "HotelLostFoundEvent"("partnerId", "createdAt");
CREATE INDEX "HotelLostFoundEvent_propertyId_createdAt_idx" ON "HotelLostFoundEvent"("propertyId", "createdAt");
