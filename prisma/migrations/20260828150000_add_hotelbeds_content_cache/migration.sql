CREATE TABLE "HotelbedsContentProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerHotelCode" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "providerUpdatedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncCorrelationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "HotelbedsContentProperty_language_providerHotelCode_key" ON "HotelbedsContentProperty"("language", "providerHotelCode");
CREATE INDEX "HotelbedsContentProperty_active_fetchedAt_idx" ON "HotelbedsContentProperty"("active", "fetchedAt");
CREATE INDEX "HotelbedsContentProperty_syncCorrelationId_idx" ON "HotelbedsContentProperty"("syncCorrelationId");
