CREATE TABLE "BookingAmendment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "requestedCheckInDate" TEXT NOT NULL,
  "requestedCheckOutDate" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingAmendment_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE
);

CREATE INDEX "BookingAmendment_bookingId_status_createdAt_idx"
  ON "BookingAmendment"("bookingId", "status", "createdAt");
