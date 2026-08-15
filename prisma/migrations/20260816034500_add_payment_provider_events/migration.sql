CREATE TABLE "PaymentProviderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" DATETIME
);
CREATE UNIQUE INDEX "PaymentProviderEvent_providerEventId_key" ON "PaymentProviderEvent"("providerEventId");
CREATE INDEX "PaymentProviderEvent_providerRef_receivedAt_idx" ON "PaymentProviderEvent"("providerRef", "receivedAt");
CREATE INDEX "PaymentProviderEvent_status_receivedAt_idx" ON "PaymentProviderEvent"("status", "receivedAt");
