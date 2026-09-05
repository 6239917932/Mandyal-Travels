ALTER TABLE "PartnerVehicle" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "PartnerVehicle" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE "PartnerVehicle" ADD COLUMN "approvalNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerVehicle" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "PartnerVehicle" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "PartnerVehicle" ADD COLUMN "reviewedByUserId" TEXT;

UPDATE "PartnerVehicle"
SET "publicationStatus" = 'DRAFT',
    "approvalStatus" = 'PENDING_REVIEW',
    "submittedAt" = CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "PartnerVehicle_pickupLocation_dropoffLocation_status_idx";
CREATE INDEX "PartnerVehicle_pickupLocation_dropoffLocation_status_publicationStatus_idx"
ON "PartnerVehicle"("pickupLocation", "dropoffLocation", "status", "publicationStatus");
CREATE INDEX "PartnerVehicle_approvalStatus_submittedAt_idx"
ON "PartnerVehicle"("approvalStatus", "submittedAt");
