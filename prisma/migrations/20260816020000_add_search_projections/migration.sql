CREATE TABLE "SearchProjectionDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "searchTerms" TEXT NOT NULL,
  "facetsJson" TEXT NOT NULL DEFAULT '{}',
  "payloadJson" TEXT NOT NULL DEFAULT '{}',
  "sourceVersion" TEXT NOT NULL,
  "projectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SearchProjectionDocument_entityType_entityId_key" ON "SearchProjectionDocument"("entityType", "entityId");
CREATE INDEX "SearchProjectionDocument_entityType_projectedAt_idx" ON "SearchProjectionDocument"("entityType", "projectedAt");
