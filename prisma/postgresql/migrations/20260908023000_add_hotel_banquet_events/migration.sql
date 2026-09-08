CREATE TABLE "HotelBanquetEvent" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "expectedGuests" INTEGER NOT NULL,
    "quoteAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "requirements" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'INQUIRY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createIdempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelBanquetEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelBanquetEventHistory" (
    "id" TEXT NOT NULL,
    "banquetEventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelBanquetEventHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelBanquetEvent_createIdempotencyKey_key" ON "HotelBanquetEvent"("createIdempotencyKey");
CREATE INDEX "HotelBanquetEvent_partnerId_createdAt_idx" ON "HotelBanquetEvent"("partnerId", "createdAt");
CREATE INDEX "HotelBanquetEvent_propertyId_eventDate_status_idx" ON "HotelBanquetEvent"("propertyId", "eventDate", "status");
CREATE INDEX "HotelBanquetEvent_propertyId_venueName_eventDate_startTime_endTime_idx" ON "HotelBanquetEvent"("propertyId", "venueName", "eventDate", "startTime", "endTime");
CREATE UNIQUE INDEX "HotelBanquetEventHistory_idempotencyKey_key" ON "HotelBanquetEventHistory"("idempotencyKey");
CREATE UNIQUE INDEX "HotelBanquetEventHistory_banquetEventId_version_key" ON "HotelBanquetEventHistory"("banquetEventId", "version");
CREATE INDEX "HotelBanquetEventHistory_banquetEventId_createdAt_idx" ON "HotelBanquetEventHistory"("banquetEventId", "createdAt");
CREATE INDEX "HotelBanquetEventHistory_actorUserId_createdAt_idx" ON "HotelBanquetEventHistory"("actorUserId", "createdAt");
ALTER TABLE "HotelBanquetEvent" ADD CONSTRAINT "HotelBanquetEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelBanquetEvent" ADD CONSTRAINT "HotelBanquetEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelBanquetEventHistory" ADD CONSTRAINT "HotelBanquetEventHistory_banquetEventId_fkey" FOREIGN KEY ("banquetEventId") REFERENCES "HotelBanquetEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
