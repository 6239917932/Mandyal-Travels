CREATE TABLE "HotelBookingAddon" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'PER_BOOKING',
    "unitAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "startsOn" TEXT NOT NULL DEFAULT '',
    "endsOn" TEXT NOT NULL DEFAULT '',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelBookingAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelBookingAddon_propertyId_name_key" ON "HotelBookingAddon"("propertyId", "name");
CREATE INDEX "HotelBookingAddon_propertyId_status_startsOn_endsOn_idx" ON "HotelBookingAddon"("propertyId", "status", "startsOn", "endsOn");
ALTER TABLE "HotelBookingAddon" ADD CONSTRAINT "HotelBookingAddon_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PriceComponent" ADD COLUMN "sourceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PriceComponent" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PriceComponent" ADD COLUMN "unitAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PriceComponent" ADD COLUMN "taxRateBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PriceComponent" ADD COLUMN "pricingMode" TEXT NOT NULL DEFAULT '';
