CREATE TABLE "PartnerBusSeatHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerBusSeatHold_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerBusSeatHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PartnerBusSeatHoldSeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holdId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerBusSeatHoldSeat_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "PartnerBusSeatHold" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerBusSeatHoldSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerBusSeatHold_tripId_userId_key" ON "PartnerBusSeatHold"("tripId", "userId");
CREATE INDEX "PartnerBusSeatHold_expiresAt_idx" ON "PartnerBusSeatHold"("expiresAt");
CREATE INDEX "PartnerBusSeatHold_userId_expiresAt_idx" ON "PartnerBusSeatHold"("userId", "expiresAt");
CREATE UNIQUE INDEX "PartnerBusSeatHoldSeat_tripId_seatNumber_key" ON "PartnerBusSeatHoldSeat"("tripId", "seatNumber");
CREATE INDEX "PartnerBusSeatHoldSeat_holdId_idx" ON "PartnerBusSeatHoldSeat"("holdId");
