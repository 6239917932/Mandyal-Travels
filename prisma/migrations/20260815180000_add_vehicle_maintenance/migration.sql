CREATE TABLE "PartnerVehicleMaintenance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "costAmount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerVehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PartnerVehicleMaintenance_vehicleId_startDate_endDate_idx" ON "PartnerVehicleMaintenance"("vehicleId", "startDate", "endDate");
CREATE INDEX "PartnerVehicleMaintenance_status_startDate_idx" ON "PartnerVehicleMaintenance"("status", "startDate");
