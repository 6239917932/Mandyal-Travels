-- CreateTable
CREATE TABLE "HotelPurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purchaseOrderNumber" TEXT NOT NULL,
    "orderDate" TEXT NOT NULL,
    "expectedDeliveryDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT NOT NULL DEFAULT '',
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedByUserId" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelPurchaseOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPurchaseOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "HotelVendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelPurchaseOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitPriceMinor" INTEGER NOT NULL,
    "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "lineSubtotalMinor" INTEGER NOT NULL,
    "lineTaxMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,
    CONSTRAINT "HotelPurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "HotelPurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPurchaseOrderLine_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "HotelStockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelPurchaseOrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
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
    CONSTRAINT "HotelPurchaseOrderEvent_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "HotelPurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPurchaseOrderEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelPurchaseOrderEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelGoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "stockMovementId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "deliveryReference" TEXT NOT NULL,
    "receivedOn" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelGoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "HotelPurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelGoodsReceipt_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "HotelPurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelGoodsReceipt_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "HotelStockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelGoodsReceipt_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "HotelStockMovement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelGoodsReceipt_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelGoodsReceipt_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HotelPurchaseOrder_partnerId_status_updatedAt_idx" ON "HotelPurchaseOrder"("partnerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "HotelPurchaseOrder_propertyId_vendorId_status_idx" ON "HotelPurchaseOrder"("propertyId", "vendorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPurchaseOrder_propertyId_purchaseOrderNumber_key" ON "HotelPurchaseOrder"("propertyId", "purchaseOrderNumber");

-- CreateIndex
CREATE INDEX "HotelPurchaseOrderLine_stockItemId_idx" ON "HotelPurchaseOrderLine"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPurchaseOrderLine_purchaseOrderId_stockItemId_key" ON "HotelPurchaseOrderLine"("purchaseOrderId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPurchaseOrderEvent_idempotencyKey_key" ON "HotelPurchaseOrderEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "HotelPurchaseOrderEvent_partnerId_createdAt_idx" ON "HotelPurchaseOrderEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelPurchaseOrderEvent_propertyId_createdAt_idx" ON "HotelPurchaseOrderEvent"("propertyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPurchaseOrderEvent_purchaseOrderId_version_key" ON "HotelPurchaseOrderEvent"("purchaseOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "HotelGoodsReceipt_stockMovementId_key" ON "HotelGoodsReceipt"("stockMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelGoodsReceipt_idempotencyKey_key" ON "HotelGoodsReceipt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "HotelGoodsReceipt_purchaseOrderId_createdAt_idx" ON "HotelGoodsReceipt"("purchaseOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelGoodsReceipt_partnerId_createdAt_idx" ON "HotelGoodsReceipt"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelGoodsReceipt_propertyId_receivedOn_idx" ON "HotelGoodsReceipt"("propertyId", "receivedOn");
