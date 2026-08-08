ALTER TABLE "Booking" ADD COLUMN "accessTokenHash" TEXT;
CREATE UNIQUE INDEX "Booking_accessTokenHash_key" ON "Booking"("accessTokenHash");
