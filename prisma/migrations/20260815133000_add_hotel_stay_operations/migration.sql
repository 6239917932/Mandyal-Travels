ALTER TABLE "Booking" ADD COLUMN "operationalStatus" TEXT NOT NULL DEFAULT 'RESERVED';

CREATE INDEX "Booking_hotelSlug_operationalStatus_createdAt_idx"
ON "Booking"("hotelSlug", "operationalStatus", "createdAt");
