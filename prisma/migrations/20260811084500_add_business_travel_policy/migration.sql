ALTER TABLE "Organization" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "defaultCabinClass" TEXT NOT NULL DEFAULT 'ECONOMY';
ALTER TABLE "Organization" ADD COLUMN "maximumTripAmount" INTEGER;
