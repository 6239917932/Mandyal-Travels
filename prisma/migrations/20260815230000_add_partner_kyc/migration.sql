ALTER TABLE "PartnerApplication" ADD COLUMN "legalBusinessName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "registeredAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "taxIdentifier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "registrationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "identityType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "identityReference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerApplication" ADD COLUMN "kycStatus" TEXT NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE "PartnerApplication" ADD COLUMN "kycConsentAt" DATETIME;
CREATE INDEX "PartnerApplication_kycStatus_createdAt_idx" ON "PartnerApplication"("kycStatus", "createdAt");
