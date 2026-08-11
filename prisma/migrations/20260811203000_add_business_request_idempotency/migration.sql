ALTER TABLE "BusinessTravelRequest" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "BusinessTravelRequest_idempotencyKey_key"
ON "BusinessTravelRequest"("idempotencyKey");
