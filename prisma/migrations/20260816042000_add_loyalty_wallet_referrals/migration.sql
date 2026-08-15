CREATE TABLE "LoyaltyAccount" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "pointsBalance" INTEGER NOT NULL DEFAULT 0,
  "walletBalance" INTEGER NOT NULL DEFAULT 0, "walletCurrency" TEXT NOT NULL DEFAULT 'INR', "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");
CREATE INDEX "LoyaltyAccount_status_updatedAt_idx" ON "LoyaltyAccount"("status", "updatedAt");
CREATE TABLE "LoyaltyLedger" (
  "id" TEXT NOT NULL PRIMARY KEY, "accountId" TEXT NOT NULL, "entryType" TEXT NOT NULL, "pointsDelta" INTEGER NOT NULL DEFAULT 0,
  "walletDelta" INTEGER NOT NULL DEFAULT 0, "walletCurrency" TEXT NOT NULL DEFAULT 'INR', "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL, "description" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LoyaltyLedger_accountId_entryType_referenceType_referenceId_key" ON "LoyaltyLedger"("accountId", "entryType", "referenceType", "referenceId");
CREATE INDEX "LoyaltyLedger_accountId_createdAt_idx" ON "LoyaltyLedger"("accountId", "createdAt");
CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerUserId" TEXT NOT NULL, "code" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "maxUses" INTEGER NOT NULL DEFAULT 20, "usedCount" INTEGER NOT NULL DEFAULT 0, "expiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_ownerUserId_status_idx" ON "ReferralCode"("ownerUserId", "status");
