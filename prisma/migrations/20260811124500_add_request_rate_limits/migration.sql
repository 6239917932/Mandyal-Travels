CREATE TABLE "RequestRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStartedAt" DATETIME NOT NULL,
    "blockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "RequestRateLimit_keyHash_key" ON "RequestRateLimit"("keyHash");
CREATE INDEX "RequestRateLimit_action_updatedAt_idx" ON "RequestRateLimit"("action", "updatedAt");
