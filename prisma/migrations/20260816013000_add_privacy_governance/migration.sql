CREATE TABLE "UserConsentRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'ACCOUNT',
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" DATETIME,
  CONSTRAINT "UserConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserConsentRecord_userId_purpose_recordedAt_idx" ON "UserConsentRecord"("userId", "purpose", "recordedAt");
CREATE INDEX "UserConsentRecord_purpose_status_recordedAt_idx" ON "UserConsentRecord"("purpose", "status", "recordedAt");

CREATE TABLE "DataPrivacyRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" DATETIME NOT NULL,
  "completedAt" DATETIME,
  "resolutionNote" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "DataPrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DataPrivacyRequest_userId_requestType_requestedAt_idx" ON "DataPrivacyRequest"("userId", "requestType", "requestedAt");
CREATE INDEX "DataPrivacyRequest_status_dueAt_idx" ON "DataPrivacyRequest"("status", "dueAt");
