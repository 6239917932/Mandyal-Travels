ALTER TABLE "PaymentCheckoutIntent" ADD COLUMN "capturedProviderRef" TEXT;

CREATE UNIQUE INDEX "PaymentCheckoutIntent_capturedProviderRef_key"
ON "PaymentCheckoutIntent"("capturedProviderRef");
