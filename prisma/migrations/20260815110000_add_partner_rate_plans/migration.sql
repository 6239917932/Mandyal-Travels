CREATE TABLE "PartnerRatePlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "ratePlanId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nightlyRate" INTEGER NOT NULL,
  "taxesAndFees" INTEGER NOT NULL,
  "mealPlan" TEXT NOT NULL DEFAULT 'room-only',
  "refundable" BOOLEAN NOT NULL DEFAULT true,
  "cancellationDescription" TEXT NOT NULL,
  "minimumStayNights" INTEGER NOT NULL DEFAULT 1,
  "maximumStayNights" INTEGER NOT NULL DEFAULT 30,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerRatePlan_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "PartnerRoomType" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerRatePlan_ratePlanId_key" ON "PartnerRatePlan"("ratePlanId");
CREATE INDEX "PartnerRatePlan_roomId_status_idx" ON "PartnerRatePlan"("roomId", "status");

INSERT INTO "PartnerRatePlan" (
  "id", "roomId", "ratePlanId", "name", "nightlyRate", "taxesAndFees", "mealPlan",
  "refundable", "cancellationDescription", "minimumStayNights", "maximumStayNights", "status"
)
SELECT
  'legacy-' || "id", "id", 'rate-' || "roomTypeId", "ratePlanName", "nightlyRate",
  "taxesAndFees", "mealPlan", "refundable", "cancellationDescription", 1, 30, 'ACTIVE'
FROM "PartnerRoomType";
