CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientHash" TEXT NOT NULL,
    "recipientDomain" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "firstObservedAt" DATETIME NOT NULL,
    "lastObservedAt" DATETIME NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "EmailProviderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL DEFAULT '',
    "payloadHash" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "EmailSuppression_recipientHash_key" ON "EmailSuppression"("recipientHash");
CREATE INDEX "EmailSuppression_reason_lastObservedAt_idx" ON "EmailSuppression"("reason", "lastObservedAt");
CREATE UNIQUE INDEX "EmailProviderEvent_provider_providerEventId_key" ON "EmailProviderEvent"("provider", "providerEventId");
CREATE INDEX "EmailProviderEvent_recipientHash_occurredAt_idx" ON "EmailProviderEvent"("recipientHash", "occurredAt");
CREATE INDEX "EmailProviderEvent_eventType_receivedAt_idx" ON "EmailProviderEvent"("eventType", "receivedAt");
