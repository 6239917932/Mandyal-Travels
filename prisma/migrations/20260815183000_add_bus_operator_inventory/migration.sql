CREATE TABLE "PartnerBusRoute" (
  "id" TEXT NOT NULL PRIMARY KEY, "partnerId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "origin" TEXT NOT NULL, "destination" TEXT NOT NULL, "boardingPoint" TEXT NOT NULL,
  "droppingPoint" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerBusRoute_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerBusRoute_code_key" ON "PartnerBusRoute"("code");
CREATE INDEX "PartnerBusRoute_partnerId_status_idx" ON "PartnerBusRoute"("partnerId", "status");
CREATE INDEX "PartnerBusRoute_origin_destination_status_idx" ON "PartnerBusRoute"("origin", "destination", "status");

CREATE TABLE "PartnerBusTrip" (
  "id" TEXT NOT NULL PRIMARY KEY, "routeId" TEXT NOT NULL, "serviceDate" TEXT NOT NULL,
  "departureTime" TEXT NOT NULL, "arrivalTime" TEXT NOT NULL, "busType" TEXT NOT NULL,
  "seatCapacity" INTEGER NOT NULL, "pricePerSeat" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
  "amenitiesJson" TEXT NOT NULL DEFAULT '[]', "cancellationPolicy" TEXT NOT NULL,
  "refundable" BOOLEAN NOT NULL DEFAULT false, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerBusTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "PartnerBusRoute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerBusTrip_routeId_serviceDate_departureTime_key" ON "PartnerBusTrip"("routeId", "serviceDate", "departureTime");
CREATE INDEX "PartnerBusTrip_serviceDate_status_idx" ON "PartnerBusTrip"("serviceDate", "status");
