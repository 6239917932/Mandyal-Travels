ALTER TABLE "PromotionCampaign" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "checkoutIntentId" TEXT,
    "bookingId" TEXT,
    "customerTripId" TEXT,
    "claimKey" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "code" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "finalTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionRedemption_checkoutIntentId_key" ON "PromotionRedemption"("checkoutIntentId");
CREATE UNIQUE INDEX "PromotionRedemption_bookingId_key" ON "PromotionRedemption"("bookingId");
CREATE UNIQUE INDEX "PromotionRedemption_customerTripId_key" ON "PromotionRedemption"("customerTripId");
CREATE UNIQUE INDEX "PromotionRedemption_claimKey_key" ON "PromotionRedemption"("claimKey");
CREATE INDEX "PromotionRedemption_campaignId_status_expiresAt_idx" ON "PromotionRedemption"("campaignId", "status", "expiresAt");
CREATE INDEX "PromotionRedemption_userId_campaignId_status_idx" ON "PromotionRedemption"("userId", "campaignId", "status");
CREATE INDEX "PromotionRedemption_status_expiresAt_idx" ON "PromotionRedemption"("status", "expiresAt");

ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_checkoutIntentId_fkey" FOREIGN KEY ("checkoutIntentId") REFERENCES "PaymentCheckoutIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
