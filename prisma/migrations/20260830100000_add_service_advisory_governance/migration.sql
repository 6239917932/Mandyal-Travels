-- CreateTable
CREATE TABLE "ServiceAdvisory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "surface" TEXT NOT NULL DEFAULT 'ALL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "resolvedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAdvisory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceAdvisoryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisoryId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceAdvisoryEvent_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "ServiceAdvisory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAdvisoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAdvisory_publicReference_key" ON "ServiceAdvisory"("publicReference");

-- CreateIndex
CREATE INDEX "ServiceAdvisory_status_startsAt_endsAt_idx" ON "ServiceAdvisory"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisory_createdAt_idx" ON "ServiceAdvisory"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_advisoryId_createdAt_idx" ON "ServiceAdvisoryEvent"("advisoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_actorUserId_createdAt_idx" ON "ServiceAdvisoryEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_action_createdAt_idx" ON "ServiceAdvisoryEvent"("action", "createdAt");
