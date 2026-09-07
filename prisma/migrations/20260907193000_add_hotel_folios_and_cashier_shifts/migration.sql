CREATE TABLE "HotelCashierShift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "activeKey" TEXT,
    "openingFloatAmount" INTEGER NOT NULL DEFAULT 0,
    "declaredClosingAmount" INTEGER,
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "openIdempotencyKey" TEXT NOT NULL,
    "closeIdempotencyKey" TEXT,
    CONSTRAINT "HotelCashierShift_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelCashierShift_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelFolioEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "cashierShiftId" TEXT,
    "entryType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "reversalOfId" TEXT,
    "postedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelFolioEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelFolioEntry_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "HotelCashierShift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelFolioEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "HotelFolioEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelCashierShift_activeKey_key" ON "HotelCashierShift"("activeKey");
CREATE UNIQUE INDEX "HotelCashierShift_openIdempotencyKey_key" ON "HotelCashierShift"("openIdempotencyKey");
CREATE UNIQUE INDEX "HotelCashierShift_closeIdempotencyKey_key" ON "HotelCashierShift"("closeIdempotencyKey");
CREATE INDEX "HotelCashierShift_partnerId_businessDate_openedAt_idx" ON "HotelCashierShift"("partnerId", "businessDate", "openedAt");
CREATE INDEX "HotelCashierShift_propertyId_status_openedAt_idx" ON "HotelCashierShift"("propertyId", "status", "openedAt");
CREATE UNIQUE INDEX "HotelFolioEntry_idempotencyKey_key" ON "HotelFolioEntry"("idempotencyKey");
CREATE UNIQUE INDEX "HotelFolioEntry_reversalOfId_key" ON "HotelFolioEntry"("reversalOfId");
CREATE INDEX "HotelFolioEntry_bookingId_createdAt_idx" ON "HotelFolioEntry"("bookingId", "createdAt");
CREATE INDEX "HotelFolioEntry_cashierShiftId_createdAt_idx" ON "HotelFolioEntry"("cashierShiftId", "createdAt");
CREATE INDEX "HotelFolioEntry_businessDate_entryType_createdAt_idx" ON "HotelFolioEntry"("businessDate", "entryType", "createdAt");
