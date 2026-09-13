PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SupplyPartner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'HOTEL',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "commissionBasisPoints" INTEGER NOT NULL DEFAULT 1800,
  "settlementDelayDays" INTEGER NOT NULL DEFAULT 2,
  "payoutDestinationVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_SupplyPartner" (
  "id", "name", "type", "status", "contactEmail", "contactPhone",
  "commissionBasisPoints", "settlementDelayDays", "payoutDestinationVersion", "createdAt", "updatedAt"
)
SELECT
  "id", "name", "type", "status", "contactEmail", "contactPhone",
  CASE WHEN "commissionBasisPoints" = 2000 THEN 1800 ELSE "commissionBasisPoints" END,
  "settlementDelayDays", "payoutDestinationVersion", "createdAt", "updatedAt"
FROM "SupplyPartner";

DROP TABLE "SupplyPartner";
ALTER TABLE "new_SupplyPartner" RENAME TO "SupplyPartner";
CREATE INDEX "SupplyPartner_status_createdAt_idx" ON "SupplyPartner"("status", "createdAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
