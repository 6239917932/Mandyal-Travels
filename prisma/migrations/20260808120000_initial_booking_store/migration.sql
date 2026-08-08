PRAGMA foreign_keys=ON;

CREATE TABLE "AvailabilityLock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomTypeId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "inventorySource" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "HotelQuote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "currency" TEXT NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "nights" INTEGER NOT NULL,
  "quotedAt" DATETIME NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "availabilityLockId" TEXT NOT NULL,
  CONSTRAINT "HotelQuote_availabilityLockId_fkey"
    FOREIGN KEY ("availabilityLockId") REFERENCES "AvailabilityLock" ("id")
);

CREATE TABLE "PriceComponent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  CONSTRAINT "PriceComponent_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "HotelQuote" ("id") ON DELETE CASCADE
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "confirmationCode" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "hotelSlug" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quoteId" TEXT NOT NULL,
  "availabilityLockId" TEXT NOT NULL,
  CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote" ("id"),
  CONSTRAINT "Booking_availabilityLockId_fkey"
    FOREIGN KEY ("availabilityLockId") REFERENCES "AvailabilityLock" ("id")
);

CREATE TABLE "BookingGuest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  CONSTRAINT "BookingGuest_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE
);

CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTransaction_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "HotelQuote_availabilityLockId_key" ON "HotelQuote"("availabilityLockId");
CREATE INDEX "PriceComponent_quoteId_idx" ON "PriceComponent"("quoteId");
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");
CREATE UNIQUE INDEX "Booking_availabilityLockId_key" ON "Booking"("availabilityLockId");
CREATE UNIQUE INDEX "BookingGuest_bookingId_key" ON "BookingGuest"("bookingId");
CREATE UNIQUE INDEX "PaymentTransaction_bookingId_key" ON "PaymentTransaction"("bookingId");
CREATE UNIQUE INDEX "PaymentTransaction_providerRef_key" ON "PaymentTransaction"("providerRef");
CREATE INDEX "AvailabilityLock_roomTypeId_status_expiresAt_idx"
  ON "AvailabilityLock"("roomTypeId", "status", "expiresAt");
