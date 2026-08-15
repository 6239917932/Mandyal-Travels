CREATE TABLE "HotelChannelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL DEFAULT 'CHANNEL_MANAGER',
    "status" TEXT NOT NULL DEFAULT 'PENDING_CONFIGURATION',
    "authenticationMode" TEXT NOT NULL DEFAULT 'EXTERNAL_SECRET',
    "externalAccountRef" TEXT NOT NULL DEFAULT '',
    "lastHealthAt" DATETIME,
    "lastHealthStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelChannelConnection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "HotelChannelPropertyMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalPropertyRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelChannelPropertyMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HotelChannelConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelChannelPropertyMapping_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "HotelChannelSyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'BIDIRECTIONAL',
    "scope" TEXT NOT NULL DEFAULT 'INVENTORY_RATES_RESTRICTIONS',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "reconciliationNote" TEXT NOT NULL DEFAULT '',
    "requestedByUserId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotelChannelSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HotelChannelConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelChannelConnection_partnerId_providerName_externalAccountRef_key" ON "HotelChannelConnection"("partnerId", "providerName", "externalAccountRef");
CREATE INDEX "HotelChannelConnection_partnerId_status_createdAt_idx" ON "HotelChannelConnection"("partnerId", "status", "createdAt");
CREATE UNIQUE INDEX "HotelChannelPropertyMapping_connectionId_propertyId_key" ON "HotelChannelPropertyMapping"("connectionId", "propertyId");
CREATE UNIQUE INDEX "HotelChannelPropertyMapping_connectionId_externalPropertyRef_key" ON "HotelChannelPropertyMapping"("connectionId", "externalPropertyRef");
CREATE INDEX "HotelChannelPropertyMapping_propertyId_status_idx" ON "HotelChannelPropertyMapping"("propertyId", "status");
CREATE INDEX "HotelChannelSyncRun_connectionId_status_createdAt_idx" ON "HotelChannelSyncRun"("connectionId", "status", "createdAt");
CREATE INDEX "HotelChannelSyncRun_status_createdAt_idx" ON "HotelChannelSyncRun"("status", "createdAt");
