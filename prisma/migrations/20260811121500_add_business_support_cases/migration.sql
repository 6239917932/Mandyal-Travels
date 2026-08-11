CREATE TABLE "BusinessSupportCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessSupportCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessSupportCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BusinessSupportCase_caseNumber_key" ON "BusinessSupportCase"("caseNumber");
CREATE INDEX "BusinessSupportCase_organizationId_status_createdAt_idx" ON "BusinessSupportCase"("organizationId", "status", "createdAt");
CREATE INDEX "BusinessSupportCase_createdByUserId_createdAt_idx" ON "BusinessSupportCase"("createdByUserId", "createdAt");
