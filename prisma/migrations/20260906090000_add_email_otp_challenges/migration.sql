CREATE TABLE "EmailOtpChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailOtpChallenge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailOtpChallenge_userId_purpose_createdAt_idx"
  ON "EmailOtpChallenge"("userId", "purpose", "createdAt");

CREATE INDEX "EmailOtpChallenge_expiresAt_consumedAt_idx"
  ON "EmailOtpChallenge"("expiresAt", "consumedAt");
