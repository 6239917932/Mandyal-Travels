CREATE TABLE "PartnerRatePlanInventoryDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ratePlanId" TEXT NOT NULL,
    "stayDate" TEXT NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerRatePlanInventoryDay_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "PartnerRatePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerRatePlanInventoryDay_ratePlanId_stayDate_key" ON "PartnerRatePlanInventoryDay"("ratePlanId", "stayDate");
CREATE INDEX "PartnerRatePlanInventoryDay_stayDate_idx" ON "PartnerRatePlanInventoryDay"("stayDate");
