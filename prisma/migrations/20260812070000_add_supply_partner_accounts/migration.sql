-- CreateTable
CREATE TABLE "SupplyPartner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOTEL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplyPartnerMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplyPartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplyPartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "hotelSlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerProperty_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerAuditLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SupplyPartner_status_createdAt_idx" ON "SupplyPartner"("status", "createdAt");
CREATE UNIQUE INDEX "SupplyPartnerMember_userId_key" ON "SupplyPartnerMember"("userId");
CREATE UNIQUE INDEX "SupplyPartnerMember_partnerId_userId_key" ON "SupplyPartnerMember"("partnerId", "userId");
CREATE INDEX "SupplyPartnerMember_partnerId_role_idx" ON "SupplyPartnerMember"("partnerId", "role");
CREATE UNIQUE INDEX "PartnerProperty_hotelSlug_key" ON "PartnerProperty"("hotelSlug");
CREATE INDEX "PartnerProperty_partnerId_status_idx" ON "PartnerProperty"("partnerId", "status");
CREATE INDEX "PartnerAuditLog_partnerId_createdAt_idx" ON "PartnerAuditLog"("partnerId", "createdAt");
CREATE INDEX "PartnerAuditLog_partnerId_action_createdAt_idx" ON "PartnerAuditLog"("partnerId", "action", "createdAt");
