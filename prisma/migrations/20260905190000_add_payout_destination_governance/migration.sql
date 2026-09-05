ALTER TABLE "SupplyPartner" ADD COLUMN "payoutDestinationVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PartnerPayoutAccount" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PartnerPayoutAccount" ADD COLUMN "reviewReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerPayoutAccount" ADD COLUMN "reviewedByUserId" TEXT;
ALTER TABLE "PartnerPayoutAccount" ADD COLUMN "reviewedAt" DATETIME;

CREATE TABLE "PartnerPayoutAccountEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payoutAccountId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPayoutAccountEvent_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "PartnerPayoutAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerPayoutAccountEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerPayoutAccountEvent_payoutAccountId_version_key" ON "PartnerPayoutAccountEvent"("payoutAccountId", "version");
CREATE INDEX "PartnerPayoutAccountEvent_payoutAccountId_createdAt_idx" ON "PartnerPayoutAccountEvent"("payoutAccountId", "createdAt");
CREATE INDEX "PartnerPayoutAccountEvent_actorUserId_createdAt_idx" ON "PartnerPayoutAccountEvent"("actorUserId", "createdAt");
