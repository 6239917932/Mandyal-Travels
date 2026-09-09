CREATE TABLE "HotelRestaurantReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL DEFAULT '',
  "contactEmail" TEXT NOT NULL DEFAULT '',
  "partySize" INTEGER NOT NULL,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createIdempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HotelRestaurantReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantReservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantReservation_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "HotelRestaurantOutlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "HotelRestaurantTable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelRestaurantReservationSlot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "slotStart" DATETIME NOT NULL,
  "lockKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelRestaurantReservationSlot_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelRestaurantReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HotelRestaurantReservationSlot_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "HotelRestaurantTable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HotelRestaurantReservationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelRestaurantReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelRestaurantReservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelRestaurantReservation_createIdempotencyKey_key" ON "HotelRestaurantReservation"("createIdempotencyKey");
CREATE INDEX "HotelRestaurantReservation_partnerId_startsAt_idx" ON "HotelRestaurantReservation"("partnerId", "startsAt");
CREATE INDEX "HotelRestaurantReservation_propertyId_status_startsAt_idx" ON "HotelRestaurantReservation"("propertyId", "status", "startsAt");
CREATE INDEX "HotelRestaurantReservation_tableId_status_startsAt_idx" ON "HotelRestaurantReservation"("tableId", "status", "startsAt");
CREATE UNIQUE INDEX "HotelRestaurantReservationSlot_lockKey_key" ON "HotelRestaurantReservationSlot"("lockKey");
CREATE UNIQUE INDEX "HotelRestaurantReservationSlot_reservationId_slotStart_key" ON "HotelRestaurantReservationSlot"("reservationId", "slotStart");
CREATE INDEX "HotelRestaurantReservationSlot_tableId_slotStart_idx" ON "HotelRestaurantReservationSlot"("tableId", "slotStart");
CREATE UNIQUE INDEX "HotelRestaurantReservationEvent_idempotencyKey_key" ON "HotelRestaurantReservationEvent"("idempotencyKey");
CREATE UNIQUE INDEX "HotelRestaurantReservationEvent_reservationId_version_key" ON "HotelRestaurantReservationEvent"("reservationId", "version");
CREATE INDEX "HotelRestaurantReservationEvent_reservationId_createdAt_idx" ON "HotelRestaurantReservationEvent"("reservationId", "createdAt");
CREATE INDEX "HotelRestaurantReservationEvent_actorUserId_createdAt_idx" ON "HotelRestaurantReservationEvent"("actorUserId", "createdAt");
