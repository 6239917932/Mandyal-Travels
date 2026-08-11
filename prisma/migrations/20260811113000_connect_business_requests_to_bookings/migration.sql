-- Connect approved organization requests to their confirmed travel record.
ALTER TABLE "BusinessTravelRequest" ADD COLUMN "bookingTotalAmount" INTEGER;
ALTER TABLE "BusinessTravelRequest" ADD COLUMN "bookedAt" DATETIME;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CustomerTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "detailsJson" TEXT NOT NULL,
    "businessTravelRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerTrip_businessTravelRequestId_fkey" FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_CustomerTrip" (
    "id", "userId", "email", "productType", "confirmationCode", "status", "title",
    "subtitle", "startDate", "endDate", "totalAmount", "currency", "detailsJson",
    "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "email", "productType", "confirmationCode", "status", "title",
    "subtitle", "startDate", "endDate", "totalAmount", "currency", "detailsJson",
    "createdAt", "updatedAt"
FROM "CustomerTrip";

DROP TABLE "CustomerTrip";
ALTER TABLE "new_CustomerTrip" RENAME TO "CustomerTrip";
CREATE UNIQUE INDEX "CustomerTrip_confirmationCode_key" ON "CustomerTrip"("confirmationCode");
CREATE UNIQUE INDEX "CustomerTrip_businessTravelRequestId_key" ON "CustomerTrip"("businessTravelRequestId");
CREATE INDEX "CustomerTrip_userId_createdAt_idx" ON "CustomerTrip"("userId", "createdAt");
CREATE INDEX "CustomerTrip_email_createdAt_idx" ON "CustomerTrip"("email", "createdAt");

CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "confirmationCode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "accessTokenHash" TEXT,
    "hotelSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT NOT NULL,
    "availabilityLockId" TEXT NOT NULL,
    "businessTravelRequestId" TEXT,
    CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_availabilityLockId_fkey" FOREIGN KEY ("availabilityLockId") REFERENCES "AvailabilityLock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_businessTravelRequestId_fkey" FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Booking" (
    "id", "confirmationCode", "idempotencyKey", "accessTokenHash", "hotelSlug", "status",
    "totalAmount", "currency", "createdAt", "quoteId", "availabilityLockId"
)
SELECT
    "id", "confirmationCode", "idempotencyKey", "accessTokenHash", "hotelSlug", "status",
    "totalAmount", "currency", "createdAt", "quoteId", "availabilityLockId"
FROM "Booking";

DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE UNIQUE INDEX "Booking_accessTokenHash_key" ON "Booking"("accessTokenHash");
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");
CREATE UNIQUE INDEX "Booking_availabilityLockId_key" ON "Booking"("availabilityLockId");
CREATE UNIQUE INDEX "Booking_businessTravelRequestId_key" ON "Booking"("businessTravelRequestId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
