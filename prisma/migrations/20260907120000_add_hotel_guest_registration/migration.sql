CREATE TABLE "HotelGuestRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "nationalityCountryCode" TEXT NOT NULL,
    "residenceCity" TEXT NOT NULL,
    "identityType" TEXT NOT NULL,
    "identityLast4" TEXT NOT NULL,
    "referenceFingerprint" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED_AT_PROPERTY',
    "consentRecorded" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelGuestRegistration_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelGuestRegistration_referenceFingerprint_key" ON "HotelGuestRegistration"("referenceFingerprint");
CREATE INDEX "HotelGuestRegistration_bookingId_createdAt_idx" ON "HotelGuestRegistration"("bookingId", "createdAt");
CREATE INDEX "HotelGuestRegistration_bookingId_verificationStatus_idx" ON "HotelGuestRegistration"("bookingId", "verificationStatus");
