CREATE TABLE "HotelRestaurantReservation" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL DEFAULT '',
  "contactEmail" TEXT NOT NULL DEFAULT '',
  "partySize" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createIdempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelRestaurantReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelRestaurantReservationSlot" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "slotStart" TIMESTAMP(3) NOT NULL,
  "lockKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelRestaurantReservationSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelRestaurantReservationEvent" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelRestaurantReservationEvent_pkey" PRIMARY KEY ("id")
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

ALTER TABLE "HotelRestaurantReservation" ADD CONSTRAINT "HotelRestaurantReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservation" ADD CONSTRAINT "HotelRestaurantReservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservation" ADD CONSTRAINT "HotelRestaurantReservation_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "HotelRestaurantOutlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservation" ADD CONSTRAINT "HotelRestaurantReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "HotelRestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservationSlot" ADD CONSTRAINT "HotelRestaurantReservationSlot_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelRestaurantReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservationSlot" ADD CONSTRAINT "HotelRestaurantReservationSlot_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "HotelRestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelRestaurantReservationEvent" ADD CONSTRAINT "HotelRestaurantReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "HotelRestaurantReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
