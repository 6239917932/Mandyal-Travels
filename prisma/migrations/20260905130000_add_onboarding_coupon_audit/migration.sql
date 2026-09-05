CREATE TABLE "PartnerOnboardingCouponEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "couponId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromActive" BOOLEAN NOT NULL,
  "toActive" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerOnboardingCouponEvent_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PartnerOnboardingCoupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerOnboardingCouponEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerOnboardingCouponEvent_couponId_version_key" ON "PartnerOnboardingCouponEvent"("couponId", "version");
CREATE INDEX "PartnerOnboardingCouponEvent_couponId_createdAt_idx" ON "PartnerOnboardingCouponEvent"("couponId", "createdAt");
CREATE INDEX "PartnerOnboardingCouponEvent_actorUserId_createdAt_idx" ON "PartnerOnboardingCouponEvent"("actorUserId", "createdAt");
CREATE INDEX "PartnerOnboardingCouponEvent_createdAt_idx" ON "PartnerOnboardingCouponEvent"("createdAt");
