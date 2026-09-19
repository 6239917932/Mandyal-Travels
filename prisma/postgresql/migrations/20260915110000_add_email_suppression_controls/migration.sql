CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "recipientDomain" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "firstObservedAt" TIMESTAMP(3) NOT NULL,
    "lastObservedAt" TIMESTAMP(3) NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL DEFAULT '',
    "payloadHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailSuppression_recipientHash_key" ON "EmailSuppression"("recipientHash");
CREATE INDEX "EmailSuppression_reason_lastObservedAt_idx" ON "EmailSuppression"("reason", "lastObservedAt");
CREATE UNIQUE INDEX "EmailProviderEvent_provider_providerEventId_key" ON "EmailProviderEvent"("provider", "providerEventId");
CREATE INDEX "EmailProviderEvent_recipientHash_occurredAt_idx" ON "EmailProviderEvent"("recipientHash", "occurredAt");
CREATE INDEX "EmailProviderEvent_eventType_receivedAt_idx" ON "EmailProviderEvent"("eventType", "receivedAt");
