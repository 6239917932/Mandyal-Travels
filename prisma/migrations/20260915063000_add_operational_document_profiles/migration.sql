ALTER TABLE "PartnerProperty" ADD COLUMN "documentTemplate" TEXT NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "PartnerProperty" ADD COLUMN "documentTheme" TEXT NOT NULL DEFAULT 'OCEAN';
ALTER TABLE "PartnerProperty" ADD COLUMN "documentHeaderText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "documentFooterText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "documentShowContact" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PartnerProperty" ADD COLUMN "documentVersion" INTEGER NOT NULL DEFAULT 0;
