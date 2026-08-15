CREATE TABLE "PaymentCheckoutIntent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "checkoutUrl" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "capturedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PaymentCheckoutIntent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentCheckoutIntent_idempotencyKey_key" ON "PaymentCheckoutIntent"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentCheckoutIntent_providerRef_key" ON "PaymentCheckoutIntent"("providerRef");
CREATE INDEX "PaymentCheckoutIntent_quoteId_status_createdAt_idx" ON "PaymentCheckoutIntent"("quoteId", "status", "createdAt");
CREATE INDEX "PaymentCheckoutIntent_status_expiresAt_idx" ON "PaymentCheckoutIntent"("status", "expiresAt");
