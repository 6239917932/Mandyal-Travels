CREATE TABLE "DestinationContent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'India',
  "summary" TEXT NOT NULL,
  "introduction" TEXT NOT NULL,
  "heroImageUrl" TEXT NOT NULL,
  "bestTimeToVisit" TEXT NOT NULL,
  "highlightsJson" TEXT NOT NULL DEFAULT '[]',
  "travelTipsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "changeReason" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DestinationContent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DestinationContent_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DestinationContentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "destinationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DestinationContentEvent_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "DestinationContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DestinationContentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DestinationContent_slug_key" ON "DestinationContent"("slug");
CREATE INDEX "DestinationContent_status_updatedAt_idx" ON "DestinationContent"("status", "updatedAt");
CREATE INDEX "DestinationContent_state_status_name_idx" ON "DestinationContent"("state", "status", "name");
CREATE INDEX "DestinationContentEvent_destinationId_createdAt_idx" ON "DestinationContentEvent"("destinationId", "createdAt");
CREATE INDEX "DestinationContentEvent_createdAt_idx" ON "DestinationContentEvent"("createdAt");
