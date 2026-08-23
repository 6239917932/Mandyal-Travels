CREATE TABLE "PlatformFeatureFlag" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "changeReason" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PlatformFeatureFlag_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PlatformFeatureFlagEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "flagKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "version" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformFeatureFlagEvent_flagKey_fkey"
    FOREIGN KEY ("flagKey") REFERENCES "PlatformFeatureFlag" ("key")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformFeatureFlagEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PlatformFeatureFlag_enabled_updatedAt_idx"
  ON "PlatformFeatureFlag"("enabled", "updatedAt");
CREATE INDEX "PlatformFeatureFlagEvent_flagKey_createdAt_idx"
  ON "PlatformFeatureFlagEvent"("flagKey", "createdAt");
CREATE INDEX "PlatformFeatureFlagEvent_createdAt_idx"
  ON "PlatformFeatureFlagEvent"("createdAt");
