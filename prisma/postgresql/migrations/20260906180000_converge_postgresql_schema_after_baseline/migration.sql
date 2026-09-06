-- Converge PostgreSQL databases whose original baseline was recorded before the
-- baseline file was incorrectly regenerated with newer application models.
-- Every operation is idempotent so this is also safe after the current baseline
-- initializes a fresh Railway database.

ALTER TABLE "SupplyPartner"
  ADD COLUMN IF NOT EXISTS "payoutDestinationVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PartnerAgreementVersion"
  ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "governanceVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "PartnerAgreementVersion"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "PartnerAgreementVersion"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "PartnerPayoutAccount"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "reviewReason" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "EmailOtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerAgreementVersionEvent" (
  "id" TEXT NOT NULL,
  "agreementVersionId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "legalApprovalReference" TEXT,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerAgreementVersionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerAgreementRelease" (
  "key" TEXT NOT NULL,
  "agreementVersionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerAgreementRelease_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "PartnerOnboardingCouponEvent" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromActive" BOOLEAN NOT NULL,
  "toActive" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerOnboardingCouponEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerPayoutAccountEvent" (
  "id" TEXT NOT NULL,
  "payoutAccountId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPayoutAccountEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailOtpChallenge_userId_purpose_createdAt_idx"
  ON "EmailOtpChallenge"("userId", "purpose", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailOtpChallenge_expiresAt_consumedAt_idx"
  ON "EmailOtpChallenge"("expiresAt", "consumedAt");
CREATE INDEX IF NOT EXISTS "PartnerAgreementVersionEvent_agreementVersionId_createdAt_idx"
  ON "PartnerAgreementVersionEvent"("agreementVersionId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerAgreementVersionEvent_actorUserId_createdAt_idx"
  ON "PartnerAgreementVersionEvent"("actorUserId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerAgreementVersionEvent_agreementVersionId_version_key"
  ON "PartnerAgreementVersionEvent"("agreementVersionId", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerAgreementRelease_agreementVersionId_key"
  ON "PartnerAgreementRelease"("agreementVersionId");
CREATE INDEX IF NOT EXISTS "PartnerAgreementRelease_updatedByUserId_updatedAt_idx"
  ON "PartnerAgreementRelease"("updatedByUserId", "updatedAt");
CREATE INDEX IF NOT EXISTS "PartnerOnboardingCouponEvent_couponId_createdAt_idx"
  ON "PartnerOnboardingCouponEvent"("couponId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerOnboardingCouponEvent_actorUserId_createdAt_idx"
  ON "PartnerOnboardingCouponEvent"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerOnboardingCouponEvent_createdAt_idx"
  ON "PartnerOnboardingCouponEvent"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerOnboardingCouponEvent_couponId_version_key"
  ON "PartnerOnboardingCouponEvent"("couponId", "version");
CREATE INDEX IF NOT EXISTS "PartnerPayoutAccountEvent_payoutAccountId_createdAt_idx"
  ON "PartnerPayoutAccountEvent"("payoutAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerPayoutAccountEvent_actorUserId_createdAt_idx"
  ON "PartnerPayoutAccountEvent"("actorUserId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPayoutAccountEvent_payoutAccountId_version_key"
  ON "PartnerPayoutAccountEvent"("payoutAccountId", "version");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailOtpChallenge_userId_fkey') THEN
    ALTER TABLE "EmailOtpChallenge" ADD CONSTRAINT "EmailOtpChallenge_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerAgreementVersionEvent_agreementVersionId_fkey') THEN
    ALTER TABLE "PartnerAgreementVersionEvent" ADD CONSTRAINT "PartnerAgreementVersionEvent_agreementVersionId_fkey"
      FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerAgreementVersionEvent_actorUserId_fkey') THEN
    ALTER TABLE "PartnerAgreementVersionEvent" ADD CONSTRAINT "PartnerAgreementVersionEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerAgreementRelease_agreementVersionId_fkey') THEN
    ALTER TABLE "PartnerAgreementRelease" ADD CONSTRAINT "PartnerAgreementRelease_agreementVersionId_fkey"
      FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerAgreementRelease_updatedByUserId_fkey') THEN
    ALTER TABLE "PartnerAgreementRelease" ADD CONSTRAINT "PartnerAgreementRelease_updatedByUserId_fkey"
      FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerOnboardingCouponEvent_couponId_fkey') THEN
    ALTER TABLE "PartnerOnboardingCouponEvent" ADD CONSTRAINT "PartnerOnboardingCouponEvent_couponId_fkey"
      FOREIGN KEY ("couponId") REFERENCES "PartnerOnboardingCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerOnboardingCouponEvent_actorUserId_fkey') THEN
    ALTER TABLE "PartnerOnboardingCouponEvent" ADD CONSTRAINT "PartnerOnboardingCouponEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerPayoutAccount_reviewedByUserId_fkey') THEN
    ALTER TABLE "PartnerPayoutAccount" ADD CONSTRAINT "PartnerPayoutAccount_reviewedByUserId_fkey"
      FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerPayoutAccountEvent_payoutAccountId_fkey') THEN
    ALTER TABLE "PartnerPayoutAccountEvent" ADD CONSTRAINT "PartnerPayoutAccountEvent_payoutAccountId_fkey"
      FOREIGN KEY ("payoutAccountId") REFERENCES "PartnerPayoutAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerPayoutAccountEvent_actorUserId_fkey') THEN
    ALTER TABLE "PartnerPayoutAccountEvent" ADD CONSTRAINT "PartnerPayoutAccountEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
