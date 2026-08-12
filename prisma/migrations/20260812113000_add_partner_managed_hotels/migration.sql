ALTER TABLE "PartnerProperty" ADD COLUMN "listingSource" TEXT NOT NULL DEFAULT 'ASSIGNED';
ALTER TABLE "PartnerProperty" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "PartnerProperty" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'India';
ALTER TABLE "PartnerProperty" ADD COLUMN "streetAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PartnerProperty" ADD COLUMN "latitude" REAL NOT NULL DEFAULT 0;
ALTER TABLE "PartnerProperty" ADD COLUMN "longitude" REAL NOT NULL DEFAULT 0;
ALTER TABLE "PartnerProperty" ADD COLUMN "starRating" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "PartnerProperty" ADD COLUMN "checkInTime" TEXT NOT NULL DEFAULT '14:00';
ALTER TABLE "PartnerProperty" ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '11:00';
ALTER TABLE "PartnerProperty" ADD COLUMN "amenitiesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PartnerProperty" ADD COLUMN "policiesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PartnerProperty" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80';

CREATE TABLE "PartnerRoomType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bedDescription" TEXT NOT NULL,
    "inventoryCount" INTEGER NOT NULL,
    "maximumAdults" INTEGER NOT NULL,
    "maximumChildren" INTEGER NOT NULL,
    "maximumGuests" INTEGER NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "taxesAndFees" INTEGER NOT NULL,
    "ratePlanName" TEXT NOT NULL,
    "mealPlan" TEXT NOT NULL DEFAULT 'room-only',
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "cancellationDescription" TEXT NOT NULL,
    "amenitiesJson" TEXT NOT NULL DEFAULT '[]',
    "imageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerRoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PartnerRoomType_roomTypeId_key" ON "PartnerRoomType"("roomTypeId");
CREATE INDEX "PartnerRoomType_propertyId_status_idx" ON "PartnerRoomType"("propertyId", "status");
CREATE INDEX "PartnerProperty_listingSource_publicationStatus_status_idx" ON "PartnerProperty"("listingSource", "publicationStatus", "status");
