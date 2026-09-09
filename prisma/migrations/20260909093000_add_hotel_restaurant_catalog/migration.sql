CREATE TABLE "HotelRestaurantOutlet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "outletCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serviceArea" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelRestaurantOutlet_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantOutlet_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelRestaurantTable" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "tableCode" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelRestaurantTable_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantTable_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantTable_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "HotelRestaurantOutlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelRestaurantMenuItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "unitPrice" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "vegetarian" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelRestaurantMenuItem_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantMenuItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantMenuItem_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "HotelRestaurantOutlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelRestaurantEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelRestaurantEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelRestaurantOutlet_propertyId_outletCode_key" ON "HotelRestaurantOutlet"("propertyId", "outletCode");
CREATE INDEX "HotelRestaurantOutlet_partnerId_status_createdAt_idx" ON "HotelRestaurantOutlet"("partnerId", "status", "createdAt");
CREATE INDEX "HotelRestaurantOutlet_propertyId_status_name_idx" ON "HotelRestaurantOutlet"("propertyId", "status", "name");
CREATE UNIQUE INDEX "HotelRestaurantTable_outletId_tableCode_key" ON "HotelRestaurantTable"("outletId", "tableCode");
CREATE INDEX "HotelRestaurantTable_partnerId_status_createdAt_idx" ON "HotelRestaurantTable"("partnerId", "status", "createdAt");
CREATE INDEX "HotelRestaurantTable_propertyId_outletId_status_idx" ON "HotelRestaurantTable"("propertyId", "outletId", "status");
CREATE UNIQUE INDEX "HotelRestaurantMenuItem_outletId_category_name_key" ON "HotelRestaurantMenuItem"("outletId", "category", "name");
CREATE INDEX "HotelRestaurantMenuItem_partnerId_status_createdAt_idx" ON "HotelRestaurantMenuItem"("partnerId", "status", "createdAt");
CREATE INDEX "HotelRestaurantMenuItem_propertyId_outletId_category_status_idx" ON "HotelRestaurantMenuItem"("propertyId", "outletId", "category", "status");
CREATE UNIQUE INDEX "HotelRestaurantEvent_idempotencyKey_key" ON "HotelRestaurantEvent"("idempotencyKey");
CREATE UNIQUE INDEX "HotelRestaurantEvent_entityType_entityId_version_key" ON "HotelRestaurantEvent"("entityType", "entityId", "version");
CREATE INDEX "HotelRestaurantEvent_partnerId_createdAt_idx" ON "HotelRestaurantEvent"("partnerId", "createdAt");
CREATE INDEX "HotelRestaurantEvent_propertyId_entityType_createdAt_idx" ON "HotelRestaurantEvent"("propertyId", "entityType", "createdAt");
