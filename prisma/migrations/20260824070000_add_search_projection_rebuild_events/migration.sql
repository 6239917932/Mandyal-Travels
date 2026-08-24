CREATE TABLE "SearchProjectionRebuildEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'HOTEL',
    "sourceCount" INTEGER NOT NULL,
    "projectedCount" INTEGER NOT NULL,
    "removedCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchProjectionRebuildEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "SearchProjectionRebuildEvent_entityType_createdAt_idx" ON "SearchProjectionRebuildEvent"("entityType", "createdAt");
CREATE INDEX "SearchProjectionRebuildEvent_actorUserId_createdAt_idx" ON "SearchProjectionRebuildEvent"("actorUserId", "createdAt");
