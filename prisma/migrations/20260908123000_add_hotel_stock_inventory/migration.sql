CREATE TABLE "HotelStockItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelStockItem_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelStockItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelStockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "resultingQuantity" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HotelStockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelStockMovement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelStockMovement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelStockItem_propertyId_sku_key" ON "HotelStockItem"("propertyId", "sku");
CREATE INDEX "HotelStockItem_partnerId_status_updatedAt_idx" ON "HotelStockItem"("partnerId", "status", "updatedAt");
CREATE INDEX "HotelStockItem_propertyId_category_status_idx" ON "HotelStockItem"("propertyId", "category", "status");
CREATE UNIQUE INDEX "HotelStockMovement_idempotencyKey_key" ON "HotelStockMovement"("idempotencyKey");
CREATE INDEX "HotelStockMovement_itemId_createdAt_idx" ON "HotelStockMovement"("itemId", "createdAt");
CREATE INDEX "HotelStockMovement_partnerId_createdAt_idx" ON "HotelStockMovement"("partnerId", "createdAt");
CREATE INDEX "HotelStockMovement_propertyId_createdAt_idx" ON "HotelStockMovement"("propertyId", "createdAt");
