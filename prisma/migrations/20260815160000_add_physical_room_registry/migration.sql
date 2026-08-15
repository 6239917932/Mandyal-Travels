CREATE TABLE "PartnerPhysicalRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floorLabel" TEXT NOT NULL DEFAULT '',
    "housekeepingStatus" TEXT NOT NULL DEFAULT 'READY',
    "operationalStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerPhysicalRoom_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerPhysicalRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "PartnerRoomType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerPhysicalRoom_propertyId_roomNumber_key" ON "PartnerPhysicalRoom"("propertyId", "roomNumber");
CREATE INDEX "PartnerPhysicalRoom_propertyId_housekeepingStatus_operationalStatus_idx" ON "PartnerPhysicalRoom"("propertyId", "housekeepingStatus", "operationalStatus");
CREATE INDEX "PartnerPhysicalRoom_roomTypeId_operationalStatus_idx" ON "PartnerPhysicalRoom"("roomTypeId", "operationalStatus");
