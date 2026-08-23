PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DataPrivacyRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" DATETIME NOT NULL,
  "completedAt" DATETIME,
  "resolutionNote" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "DataPrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DataPrivacyRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_DataPrivacyRequest" ("completedAt", "dueAt", "id", "requestedAt", "requestType", "resolutionNote", "status", "userId")
SELECT "completedAt", "dueAt", "id", "requestedAt", "requestType", "resolutionNote", "status", "userId" FROM "DataPrivacyRequest";

DROP TABLE "DataPrivacyRequest";
ALTER TABLE "new_DataPrivacyRequest" RENAME TO "DataPrivacyRequest";
CREATE INDEX "DataPrivacyRequest_userId_requestType_requestedAt_idx" ON "DataPrivacyRequest"("userId", "requestType", "requestedAt");
CREATE INDEX "DataPrivacyRequest_status_dueAt_idx" ON "DataPrivacyRequest"("status", "dueAt");
CREATE INDEX "DataPrivacyRequest_reviewedByUserId_idx" ON "DataPrivacyRequest"("reviewedByUserId");

CREATE TABLE "DataPrivacyRequestEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataPrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataPrivacyRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DataPrivacyRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "DataPrivacyRequestEvent_requestId_createdAt_idx" ON "DataPrivacyRequestEvent"("requestId", "createdAt");
CREATE INDEX "DataPrivacyRequestEvent_actorUserId_createdAt_idx" ON "DataPrivacyRequestEvent"("actorUserId", "createdAt");

PRAGMA foreign_keys=ON;
