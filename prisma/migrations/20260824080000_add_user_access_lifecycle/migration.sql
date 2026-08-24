ALTER TABLE "User" ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "accessChangedAt" DATETIME;

CREATE INDEX "User_role_accessStatus_idx" ON "User"("role", "accessStatus");

CREATE TABLE "UserAccessEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAccessEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserAccessEvent_userId_version_key" ON "UserAccessEvent"("userId", "version");
CREATE INDEX "UserAccessEvent_userId_createdAt_idx" ON "UserAccessEvent"("userId", "createdAt");
CREATE INDEX "UserAccessEvent_actorUserId_createdAt_idx" ON "UserAccessEvent"("actorUserId", "createdAt");
CREATE INDEX "UserAccessEvent_action_createdAt_idx" ON "UserAccessEvent"("action", "createdAt");
