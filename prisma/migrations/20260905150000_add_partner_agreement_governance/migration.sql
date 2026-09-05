ALTER TABLE "PartnerAgreementVersion" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerAgreementVersion" ADD COLUMN "governanceVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PartnerAgreementVersion" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "PartnerAgreementVersion" ADD COLUMN "retiredAt" DATETIME;
ALTER TABLE "PartnerAgreementVersion" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "PartnerAgreementVersionEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementVersionId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "legalApprovalReference" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerAgreementVersionEvent_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerAgreementVersionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerAgreementVersionEvent_agreementVersionId_version_key" ON "PartnerAgreementVersionEvent"("agreementVersionId", "version");
CREATE INDEX "PartnerAgreementVersionEvent_agreementVersionId_createdAt_idx" ON "PartnerAgreementVersionEvent"("agreementVersionId", "createdAt");
CREATE INDEX "PartnerAgreementVersionEvent_actorUserId_createdAt_idx" ON "PartnerAgreementVersionEvent"("actorUserId", "createdAt");
CREATE INDEX "PartnerAgreementVersionEvent_createdAt_idx" ON "PartnerAgreementVersionEvent"("createdAt");

CREATE TABLE "PartnerAgreementRelease" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "agreementVersionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerAgreementRelease_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerAgreementRelease_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerAgreementRelease_agreementVersionId_key" ON "PartnerAgreementRelease"("agreementVersionId");
CREATE INDEX "PartnerAgreementRelease_updatedAt_idx" ON "PartnerAgreementRelease"("updatedAt");
