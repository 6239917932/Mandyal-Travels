CREATE TABLE "PromotionCampaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "productsJson" TEXT NOT NULL,
  "percentOff" INTEGER NOT NULL,
  "maximumDiscount" INTEGER NOT NULL,
  "minimumSubtotal" INTEGER NOT NULL,
  "usageLimit" INTEGER,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PromotionCampaign_code_key" ON "PromotionCampaign"("code");
CREATE INDEX "PromotionCampaign_active_startsAt_endsAt_idx" ON "PromotionCampaign"("active", "startsAt", "endsAt");
CREATE INDEX "PromotionCampaign_updatedAt_idx" ON "PromotionCampaign"("updatedAt");
