ALTER TABLE "SupplyPartner" ALTER COLUMN "commissionBasisPoints" SET DEFAULT 1800;
UPDATE "SupplyPartner"
SET "commissionBasisPoints" = 1800
WHERE "commissionBasisPoints" = 2000;
