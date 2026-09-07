CREATE TABLE "HotelPosOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "folioEntryId" TEXT,
    "serviceMode" TEXT NOT NULL,
    "outletName" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL DEFAULT '',
    "itemsJson" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createIdempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelPosOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPosOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPosOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPosOrder_folioEntryId_fkey" FOREIGN KEY ("folioEntryId") REFERENCES "HotelFolioEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelPosOrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelPosOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "HotelPosOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelPosOrder_folioEntryId_key" ON "HotelPosOrder"("folioEntryId");
CREATE UNIQUE INDEX "HotelPosOrder_createIdempotencyKey_key" ON "HotelPosOrder"("createIdempotencyKey");
CREATE INDEX "HotelPosOrder_partnerId_createdAt_idx" ON "HotelPosOrder"("partnerId", "createdAt");
CREATE INDEX "HotelPosOrder_propertyId_status_createdAt_idx" ON "HotelPosOrder"("propertyId", "status", "createdAt");
CREATE INDEX "HotelPosOrder_bookingId_createdAt_idx" ON "HotelPosOrder"("bookingId", "createdAt");
CREATE INDEX "HotelPosOrder_businessDate_status_createdAt_idx" ON "HotelPosOrder"("businessDate", "status", "createdAt");
CREATE UNIQUE INDEX "HotelPosOrderEvent_idempotencyKey_key" ON "HotelPosOrderEvent"("idempotencyKey");
CREATE UNIQUE INDEX "HotelPosOrderEvent_orderId_version_key" ON "HotelPosOrderEvent"("orderId", "version");
CREATE INDEX "HotelPosOrderEvent_orderId_createdAt_idx" ON "HotelPosOrderEvent"("orderId", "createdAt");
CREATE INDEX "HotelPosOrderEvent_actorUserId_createdAt_idx" ON "HotelPosOrderEvent"("actorUserId", "createdAt");
