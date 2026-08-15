ALTER TABLE "HotelReview" ADD COLUMN "moderationNote" TEXT;
ALTER TABLE "HotelReview" ADD COLUMN "moderatedAt" DATETIME;
ALTER TABLE "HotelReview" ADD COLUMN "moderatedByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HotelReview" ADD COLUMN "partnerReply" TEXT;
ALTER TABLE "HotelReview" ADD COLUMN "partnerRepliedAt" DATETIME;

CREATE INDEX "HotelReview_moderatedByUserId_idx" ON "HotelReview"("moderatedByUserId");
