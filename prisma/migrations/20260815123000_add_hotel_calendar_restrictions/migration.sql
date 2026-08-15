ALTER TABLE "PartnerHotelInventoryDay" ADD COLUMN "minimumStayNights" INTEGER;
ALTER TABLE "PartnerHotelInventoryDay" ADD COLUMN "maximumStayNights" INTEGER;
ALTER TABLE "PartnerHotelInventoryDay" ADD COLUMN "closedToArrival" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PartnerHotelInventoryDay" ADD COLUMN "closedToDeparture" BOOLEAN NOT NULL DEFAULT false;
