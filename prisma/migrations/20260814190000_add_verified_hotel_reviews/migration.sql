CREATE TABLE "HotelReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelSlug" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelReview_bookingId_key" ON "HotelReview"("bookingId");
CREATE INDEX "HotelReview_hotelSlug_status_createdAt_idx" ON "HotelReview"("hotelSlug", "status", "createdAt");
CREATE INDEX "HotelReview_userId_createdAt_idx" ON "HotelReview"("userId", "createdAt");
