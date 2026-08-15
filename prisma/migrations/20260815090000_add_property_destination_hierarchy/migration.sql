ALTER TABLE "PartnerProperty" ADD COLUMN "locality" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "tehsil" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "district" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "locationAliasesJson" TEXT NOT NULL DEFAULT '[]';

UPDATE "PartnerProperty"
SET "locality" = "city"
WHERE "locality" = '';
