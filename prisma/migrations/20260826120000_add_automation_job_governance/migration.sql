CREATE TABLE "AutomationJobLease" (
    "jobKey" TEXT NOT NULL PRIMARY KEY,
    "leaseTokenHash" TEXT NOT NULL,
    "leaseExpiresAt" DATETIME NOT NULL,
    "lastStartedAt" DATETIME,
    "lastCompletedAt" DATETIME,
    "lastStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "lastSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AutomationJobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobKey" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "errorCode" TEXT NOT NULL DEFAULT '',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AutomationJobLease_leaseExpiresAt_idx" ON "AutomationJobLease"("leaseExpiresAt");
CREATE INDEX "AutomationJobLease_lastStatus_updatedAt_idx" ON "AutomationJobLease"("lastStatus", "updatedAt");
CREATE UNIQUE INDEX "AutomationJobRun_correlationId_key" ON "AutomationJobRun"("correlationId");
CREATE INDEX "AutomationJobRun_jobKey_startedAt_idx" ON "AutomationJobRun"("jobKey", "startedAt");
CREATE INDEX "AutomationJobRun_status_startedAt_idx" ON "AutomationJobRun"("status", "startedAt");
