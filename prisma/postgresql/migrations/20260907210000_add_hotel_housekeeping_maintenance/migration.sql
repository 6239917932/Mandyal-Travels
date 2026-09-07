CREATE TABLE "HotelHousekeepingInspection" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "physicalRoomId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "businessDate" TEXT NOT NULL,
    "inspectedByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelHousekeepingInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelMaintenanceWorkOrder" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "physicalRoomId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "openedByUserId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createIdempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    CONSTRAINT "HotelMaintenanceWorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelMaintenanceWorkOrderEvent" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelMaintenanceWorkOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelHousekeepingInspection_idempotencyKey_key" ON "HotelHousekeepingInspection"("idempotencyKey");
CREATE INDEX "HotelHousekeepingInspection_partnerId_inspectedAt_idx" ON "HotelHousekeepingInspection"("partnerId", "inspectedAt");
CREATE INDEX "HotelHousekeepingInspection_propertyId_businessDate_inspectedAt_idx" ON "HotelHousekeepingInspection"("propertyId", "businessDate", "inspectedAt");
CREATE INDEX "HotelHousekeepingInspection_physicalRoomId_inspectedAt_idx" ON "HotelHousekeepingInspection"("physicalRoomId", "inspectedAt");
CREATE UNIQUE INDEX "HotelMaintenanceWorkOrder_createIdempotencyKey_key" ON "HotelMaintenanceWorkOrder"("createIdempotencyKey");
CREATE INDEX "HotelMaintenanceWorkOrder_partnerId_status_createdAt_idx" ON "HotelMaintenanceWorkOrder"("partnerId", "status", "createdAt");
CREATE INDEX "HotelMaintenanceWorkOrder_propertyId_status_priority_createdAt_idx" ON "HotelMaintenanceWorkOrder"("propertyId", "status", "priority", "createdAt");
CREATE INDEX "HotelMaintenanceWorkOrder_physicalRoomId_status_createdAt_idx" ON "HotelMaintenanceWorkOrder"("physicalRoomId", "status", "createdAt");
CREATE UNIQUE INDEX "HotelMaintenanceWorkOrderEvent_workOrderId_version_key" ON "HotelMaintenanceWorkOrderEvent"("workOrderId", "version");
CREATE INDEX "HotelMaintenanceWorkOrderEvent_workOrderId_createdAt_idx" ON "HotelMaintenanceWorkOrderEvent"("workOrderId", "createdAt");
CREATE INDEX "HotelMaintenanceWorkOrderEvent_actorUserId_createdAt_idx" ON "HotelMaintenanceWorkOrderEvent"("actorUserId", "createdAt");

ALTER TABLE "HotelHousekeepingInspection" ADD CONSTRAINT "HotelHousekeepingInspection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelHousekeepingInspection" ADD CONSTRAINT "HotelHousekeepingInspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelHousekeepingInspection" ADD CONSTRAINT "HotelHousekeepingInspection_physicalRoomId_fkey" FOREIGN KEY ("physicalRoomId") REFERENCES "PartnerPhysicalRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelMaintenanceWorkOrder" ADD CONSTRAINT "HotelMaintenanceWorkOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelMaintenanceWorkOrder" ADD CONSTRAINT "HotelMaintenanceWorkOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelMaintenanceWorkOrder" ADD CONSTRAINT "HotelMaintenanceWorkOrder_physicalRoomId_fkey" FOREIGN KEY ("physicalRoomId") REFERENCES "PartnerPhysicalRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelMaintenanceWorkOrderEvent" ADD CONSTRAINT "HotelMaintenanceWorkOrderEvent_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "HotelMaintenanceWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
