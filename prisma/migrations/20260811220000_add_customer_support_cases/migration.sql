CREATE TABLE "CustomerSupportCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "customerTripId" TEXT,
    "hotelBookingId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerSupportCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerSupportCase_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerSupportCase_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerSupportCase_hotelBookingId_fkey" FOREIGN KEY ("hotelBookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CustomerSupportCaseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerSupportCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CustomerSupportCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerSupportCaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomerSupportCase_caseNumber_key" ON "CustomerSupportCase"("caseNumber");
CREATE INDEX "CustomerSupportCase_userId_status_createdAt_idx" ON "CustomerSupportCase"("userId", "status", "createdAt");
CREATE INDEX "CustomerSupportCase_status_updatedAt_idx" ON "CustomerSupportCase"("status", "updatedAt");
CREATE INDEX "CustomerSupportCase_customerTripId_idx" ON "CustomerSupportCase"("customerTripId");
CREATE INDEX "CustomerSupportCase_hotelBookingId_idx" ON "CustomerSupportCase"("hotelBookingId");
CREATE INDEX "CustomerSupportCaseEvent_caseId_createdAt_idx" ON "CustomerSupportCaseEvent"("caseId", "createdAt");
CREATE INDEX "CustomerSupportCaseEvent_actorUserId_createdAt_idx" ON "CustomerSupportCaseEvent"("actorUserId", "createdAt");
