CREATE TABLE "OrganizationPolicyVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,
    "defaultCabinClass" TEXT NOT NULL,
    "maximumTripAmount" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationPolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationPolicyVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "OrganizationPolicyVersion" (
    "id",
    "organizationId",
    "version",
    "approvalRequired",
    "defaultCabinClass",
    "maximumTripAmount",
    "createdAt"
)
SELECT
    'policy_' || lower(hex(randomblob(12))),
    "id",
    1,
    "approvalRequired",
    "defaultCabinClass",
    "maximumTripAmount",
    "updatedAt"
FROM "Organization";

CREATE UNIQUE INDEX "OrganizationPolicyVersion_organizationId_version_key" ON "OrganizationPolicyVersion"("organizationId", "version");
CREATE INDEX "OrganizationPolicyVersion_organizationId_createdAt_idx" ON "OrganizationPolicyVersion"("organizationId", "createdAt");

ALTER TABLE "BusinessTravelRequest" ADD COLUMN "policyVersionId" TEXT REFERENCES "OrganizationPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "BusinessTravelRequest_policyVersionId_idx" ON "BusinessTravelRequest"("policyVersionId");
