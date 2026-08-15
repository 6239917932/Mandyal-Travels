CREATE TABLE "IntegrationOutboxEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingId" TEXT,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8,
  "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" DATETIME,
  "processedAt" DATETIME,
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "IntegrationOutboxEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IntegrationOutboxEvent_dedupeKey_key" ON "IntegrationOutboxEvent"("dedupeKey");
CREATE INDEX "IntegrationOutboxEvent_status_nextAttemptAt_createdAt_idx" ON "IntegrationOutboxEvent"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "IntegrationOutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "IntegrationOutboxEvent"("aggregateType", "aggregateId", "createdAt");
CREATE INDEX "IntegrationOutboxEvent_bookingId_createdAt_idx" ON "IntegrationOutboxEvent"("bookingId", "createdAt");
