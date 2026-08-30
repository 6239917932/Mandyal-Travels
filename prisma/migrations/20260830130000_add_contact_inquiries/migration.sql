-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactInquiry_reference_key" ON "ContactInquiry"("reference");

-- CreateIndex
CREATE INDEX "ContactInquiry_status_createdAt_idx" ON "ContactInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_email_createdAt_idx" ON "ContactInquiry"("email", "createdAt");
