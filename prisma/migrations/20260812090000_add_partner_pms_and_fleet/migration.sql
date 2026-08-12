-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "partnerId" TEXT,
    "businessName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "inventorySummary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PartnerApplication_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerHotelInventoryDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "stayDate" TEXT NOT NULL,
    "availableRooms" INTEGER NOT NULL,
    "nightlyRate" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerHotelInventoryDay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "transmission" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "bags" INTEGER NOT NULL,
    "fuelPolicy" TEXT NOT NULL,
    "mileagePolicy" TEXT NOT NULL,
    "cancellationPolicy" TEXT NOT NULL,
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "pricePerDay" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalUnits" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerVehicle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerVehicleInventoryDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "serviceDate" TEXT NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "pricePerDay" INTEGER,
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerVehicleInventoryDay_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");
CREATE INDEX "PartnerApplication_applicantUserId_createdAt_idx" ON "PartnerApplication"("applicantUserId", "createdAt");
CREATE UNIQUE INDEX "PartnerHotelInventoryDay_propertyId_roomTypeId_stayDate_key" ON "PartnerHotelInventoryDay"("propertyId", "roomTypeId", "stayDate");
CREATE INDEX "PartnerHotelInventoryDay_propertyId_stayDate_idx" ON "PartnerHotelInventoryDay"("propertyId", "stayDate");
CREATE UNIQUE INDEX "PartnerVehicle_code_key" ON "PartnerVehicle"("code");
CREATE INDEX "PartnerVehicle_partnerId_status_idx" ON "PartnerVehicle"("partnerId", "status");
CREATE INDEX "PartnerVehicle_pickupLocation_dropoffLocation_status_idx" ON "PartnerVehicle"("pickupLocation", "dropoffLocation", "status");
CREATE UNIQUE INDEX "PartnerVehicleInventoryDay_vehicleId_serviceDate_key" ON "PartnerVehicleInventoryDay"("vehicleId", "serviceDate");
CREATE INDEX "PartnerVehicleInventoryDay_vehicleId_serviceDate_idx" ON "PartnerVehicleInventoryDay"("vehicleId", "serviceDate");
