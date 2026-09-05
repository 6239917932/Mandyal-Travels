CREATE TABLE "PartnerAgreementVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "effectiveAt" DATETIME,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerAgreementVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerAgreementVersion_version_key" ON "PartnerAgreementVersion"("version");
CREATE INDEX "PartnerAgreementVersion_status_effectiveAt_idx" ON "PartnerAgreementVersion"("status", "effectiveAt");

CREATE TABLE "PartnerPhoneVerification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "phoneHash" TEXT NOT NULL,
  "phoneLast4" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" DATETIME NOT NULL,
  "verifiedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerPhoneVerification_providerRef_key" ON "PartnerPhoneVerification"("providerRef");
CREATE INDEX "PartnerPhoneVerification_userId_status_expiresAt_idx" ON "PartnerPhoneVerification"("userId", "status", "expiresAt");

CREATE TABLE "PartnerAgreementAcceptance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "agreementVersionId" TEXT NOT NULL,
  "phoneVerificationId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "acceptedName" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "userAgentHash" TEXT NOT NULL,
  "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerAgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerAgreementAcceptance_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerAgreementAcceptance_phoneVerificationId_fkey" FOREIGN KEY ("phoneVerificationId") REFERENCES "PartnerPhoneVerification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerAgreementAcceptance_userId_agreementVersionId_key" ON "PartnerAgreementAcceptance"("userId", "agreementVersionId");
CREATE UNIQUE INDEX "PartnerAgreementAcceptance_phoneVerificationId_agreementVersionId_key" ON "PartnerAgreementAcceptance"("phoneVerificationId", "agreementVersionId");
CREATE INDEX "PartnerAgreementAcceptance_agreementVersionId_acceptedAt_idx" ON "PartnerAgreementAcceptance"("agreementVersionId", "acceptedAt");

CREATE TABLE "PartnerOnboardingCoupon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "waiverPercent" INTEGER NOT NULL DEFAULT 100,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerOnboardingCoupon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerOnboardingCoupon_code_key" ON "PartnerOnboardingCoupon"("code");
CREATE INDEX "PartnerOnboardingCoupon_active_startsAt_endsAt_idx" ON "PartnerOnboardingCoupon"("active", "startsAt", "endsAt");

CREATE TABLE "PartnerOnboardingOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "couponId" TEXT,
  "agreementAcceptanceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "priceVersion" TEXT NOT NULL,
  "oneTimeSetupAmount" INTEGER NOT NULL,
  "monthlySubscriptionAmount" INTEGER NOT NULL,
  "subtotalAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "dueNowAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "couponCodeSnapshot" TEXT NOT NULL DEFAULT '',
  "provider" TEXT NOT NULL DEFAULT '',
  "providerRef" TEXT,
  "checkoutUrl" TEXT NOT NULL DEFAULT '',
  "expiresAt" DATETIME,
  "capturedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartnerOnboardingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerOnboardingOrder_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PartnerOnboardingCoupon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerOnboardingOrder_agreementAcceptanceId_fkey" FOREIGN KEY ("agreementAcceptanceId") REFERENCES "PartnerAgreementAcceptance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerOnboardingOrder_agreementAcceptanceId_key" ON "PartnerOnboardingOrder"("agreementAcceptanceId");
CREATE UNIQUE INDEX "PartnerOnboardingOrder_idempotencyKey_key" ON "PartnerOnboardingOrder"("idempotencyKey");
CREATE UNIQUE INDEX "PartnerOnboardingOrder_providerRef_key" ON "PartnerOnboardingOrder"("providerRef");
CREATE UNIQUE INDEX "PartnerOnboardingOrder_userId_couponId_key" ON "PartnerOnboardingOrder"("userId", "couponId");
CREATE INDEX "PartnerOnboardingOrder_userId_status_createdAt_idx" ON "PartnerOnboardingOrder"("userId", "status", "createdAt");
CREATE INDEX "PartnerOnboardingOrder_status_expiresAt_idx" ON "PartnerOnboardingOrder"("status", "expiresAt");
