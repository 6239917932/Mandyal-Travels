CREATE TABLE "HotelStockLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STORE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelStockLocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLocation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelStockLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL DEFAULT '',
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelStockLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HotelStockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "HotelStockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelStockLotEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromLotId" TEXT,
    "toLotId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reversalOfId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelStockLotEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HotelStockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_fromLotId_fkey" FOREIGN KEY ("fromLotId") REFERENCES "HotelStockLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_toLotId_fkey" FOREIGN KEY ("toLotId") REFERENCES "HotelStockLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "HotelStockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "HotelStockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelStockLotEvent_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "HotelStockLotEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelStockLocation_propertyId_code_key" ON "HotelStockLocation"("propertyId", "code");
CREATE INDEX "HotelStockLocation_partnerId_status_updatedAt_idx" ON "HotelStockLocation"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelStockLocation_propertyId_status_name_idx" ON "HotelStockLocation"("propertyId", "status", "name");
CREATE UNIQUE INDEX "HotelStockLot_itemId_locationId_lotCode_key" ON "HotelStockLot"("itemId", "locationId", "lotCode");
CREATE INDEX "HotelStockLot_partnerId_status_updatedAt_idx" ON "HotelStockLot"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelStockLot_propertyId_expiryDate_status_idx" ON "HotelStockLot"("propertyId", "expiryDate", "status");
CREATE INDEX "HotelStockLot_locationId_status_lotCode_idx" ON "HotelStockLot"("locationId", "status", "lotCode");
CREATE UNIQUE INDEX "HotelStockLotEvent_reversalOfId_key" ON "HotelStockLotEvent"("reversalOfId");
CREATE UNIQUE INDEX "HotelStockLotEvent_idempotencyKey_key" ON "HotelStockLotEvent"("idempotencyKey");
CREATE INDEX "HotelStockLotEvent_itemId_createdAt_idx" ON "HotelStockLotEvent"("itemId", "createdAt");
CREATE INDEX "HotelStockLotEvent_partnerId_createdAt_idx" ON "HotelStockLotEvent"("partnerId", "createdAt");
CREATE INDEX "HotelStockLotEvent_propertyId_createdAt_idx" ON "HotelStockLotEvent"("propertyId", "createdAt");
CREATE INDEX "HotelStockLotEvent_fromLotId_createdAt_idx" ON "HotelStockLotEvent"("fromLotId", "createdAt");
