UPDATE "BookingGuest"
SET "email" = LOWER(TRIM("email"));

CREATE INDEX "BookingGuest_email_idx" ON "BookingGuest"("email");
