CREATE TABLE "PromotionCampaignEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromActive" BOOLEAN NOT NULL,
  "toActive" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionCampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionCampaignEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PromotionCampaignEvent_campaignId_createdAt_idx" ON "PromotionCampaignEvent"("campaignId", "createdAt");
CREATE INDEX "PromotionCampaignEvent_actorUserId_createdAt_idx" ON "PromotionCampaignEvent"("actorUserId", "createdAt");
CREATE INDEX "PromotionCampaignEvent_createdAt_idx" ON "PromotionCampaignEvent"("createdAt");
