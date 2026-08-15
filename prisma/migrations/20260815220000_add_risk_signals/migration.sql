CREATE TABLE "RiskSignal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "signalType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "evidenceJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedToUserId" TEXT,
  "reviewedByUserId" TEXT,
  "resolutionNote" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "RiskSignal_status_severity_createdAt_idx" ON "RiskSignal"("status", "severity", "createdAt");
CREATE INDEX "RiskSignal_subjectType_subjectId_createdAt_idx" ON "RiskSignal"("subjectType", "subjectId", "createdAt");
CREATE INDEX "RiskSignal_signalType_createdAt_idx" ON "RiskSignal"("signalType", "createdAt");
