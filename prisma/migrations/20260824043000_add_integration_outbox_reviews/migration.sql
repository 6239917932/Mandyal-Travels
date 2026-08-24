CREATE TABLE "IntegrationOutboxReviewEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationOutboxReviewEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IntegrationOutboxEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntegrationOutboxReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "IntegrationOutboxReviewEvent_eventId_createdAt_idx" ON "IntegrationOutboxReviewEvent"("eventId", "createdAt");
CREATE INDEX "IntegrationOutboxReviewEvent_actorUserId_createdAt_idx" ON "IntegrationOutboxReviewEvent"("actorUserId", "createdAt");
