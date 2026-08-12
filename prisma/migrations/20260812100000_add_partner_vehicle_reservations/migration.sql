CREATE TABLE "PartnerVehicleReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "confirmationCode" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerTripId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "pickupDate" TEXT NOT NULL,
    "dropoffDate" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerVehicleReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerVehicleReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnerVehicleReservation_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerVehicleReservation_confirmationCode_key" ON "PartnerVehicleReservation"("confirmationCode");
CREATE UNIQUE INDEX "PartnerVehicleReservation_customerTripId_key" ON "PartnerVehicleReservation"("customerTripId");
CREATE INDEX "PartnerVehicleReservation_partnerId_status_createdAt_idx" ON "PartnerVehicleReservation"("partnerId", "status", "createdAt");
CREATE INDEX "PartnerVehicleReservation_vehicleId_pickupDate_dropoffDate_status_idx" ON "PartnerVehicleReservation"("vehicleId", "pickupDate", "dropoffDate", "status");
