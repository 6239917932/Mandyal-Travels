ALTER TABLE "ContactInquiry" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ContactInquiry" ADD COLUMN "reviewNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactInquiry" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "ContactInquiryReviewEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactInquiryReviewEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactInquiryReviewEvent_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "ContactInquiry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContactInquiryReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContactInquiryReviewEvent_inquiryId_version_key" ON "ContactInquiryReviewEvent"("inquiryId", "version");
CREATE INDEX "ContactInquiryReviewEvent_inquiryId_createdAt_idx" ON "ContactInquiryReviewEvent"("inquiryId", "createdAt");
CREATE INDEX "ContactInquiryReviewEvent_actorUserId_createdAt_idx" ON "ContactInquiryReviewEvent"("actorUserId", "createdAt");
