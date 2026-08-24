ALTER TABLE "PartnerSettlement" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "PartnerSettlementEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "settlementId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerSettlementEvent_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerSettlementEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PartnerSettlementEvent_settlementId_createdAt_idx" ON "PartnerSettlementEvent"("settlementId", "createdAt");
CREATE INDEX "PartnerSettlementEvent_actorUserId_createdAt_idx" ON "PartnerSettlementEvent"("actorUserId", "createdAt");
CREATE INDEX "PartnerSettlementEvent_createdAt_idx" ON "PartnerSettlementEvent"("createdAt");
