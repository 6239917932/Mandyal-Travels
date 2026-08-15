ALTER TABLE "PartnerProperty" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "PartnerProperty" ADD COLUMN "approvalNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "PartnerProperty" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "PartnerProperty" ADD COLUMN "reviewedByUserId" TEXT;
CREATE INDEX "PartnerProperty_approvalStatus_submittedAt_idx" ON "PartnerProperty"("approvalStatus", "submittedAt");
