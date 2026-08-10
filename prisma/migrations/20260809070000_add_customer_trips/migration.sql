CREATE TABLE "CustomerTrip" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "confirmationCode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  "totalAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "detailsJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CustomerTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomerTrip_confirmationCode_key" ON "CustomerTrip"("confirmationCode");
CREATE INDEX "CustomerTrip_userId_createdAt_idx" ON "CustomerTrip"("userId", "createdAt");
CREATE INDEX "CustomerTrip_email_createdAt_idx" ON "CustomerTrip"("email", "createdAt");
