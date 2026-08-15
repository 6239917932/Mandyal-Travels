CREATE TABLE "PartnerBusReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "confirmationCode" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "customerTripId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "seatNumbersJson" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerBusReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerBusReservation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnerBusReservation_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerBusReservation_confirmationCode_key" ON "PartnerBusReservation"("confirmationCode");
CREATE UNIQUE INDEX "PartnerBusReservation_customerTripId_key" ON "PartnerBusReservation"("customerTripId");
CREATE INDEX "PartnerBusReservation_tripId_status_idx" ON "PartnerBusReservation"("tripId", "status");
CREATE INDEX "PartnerBusReservation_partnerId_status_createdAt_idx" ON "PartnerBusReservation"("partnerId", "status", "createdAt");
