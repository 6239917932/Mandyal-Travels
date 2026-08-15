CREATE TABLE "FlightSupplierConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "credentialRef" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "lastHealthStatus" TEXT NOT NULL DEFAULT 'NOT_TESTED',
  "lastHealthAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FlightSupplierConnection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FlightSupplierConnection_partnerId_providerCode_environment_key" ON "FlightSupplierConnection"("partnerId", "providerCode", "environment");
CREATE INDEX "FlightSupplierConnection_partnerId_status_updatedAt_idx" ON "FlightSupplierConnection"("partnerId", "status", "updatedAt");

CREATE TABLE "FlightSupplierOperation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "providerRef" TEXT NOT NULL DEFAULT '',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT NOT NULL DEFAULT '',
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FlightSupplierOperation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FlightSupplierConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FlightSupplierOperation_connectionId_correlationId_key" ON "FlightSupplierOperation"("connectionId", "correlationId");
CREATE INDEX "FlightSupplierOperation_status_nextAttemptAt_createdAt_idx" ON "FlightSupplierOperation"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "FlightSupplierOperation_connectionId_createdAt_idx" ON "FlightSupplierOperation"("connectionId", "createdAt");
