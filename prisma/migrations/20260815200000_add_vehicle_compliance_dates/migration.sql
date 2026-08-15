ALTER TABLE "PartnerVehicle" ADD COLUMN "registrationExpiry" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerVehicle" ADD COLUMN "insuranceExpiry" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerVehicle" ADD COLUMN "permitExpiry" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerVehicle" ADD COLUMN "fitnessExpiry" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerVehicle" ADD COLUMN "pollutionExpiry" TEXT NOT NULL DEFAULT '';
