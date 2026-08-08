CREATE TABLE "RoomInventoryOverride" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomTypeId" TEXT NOT NULL,
  "stayDate" TEXT NOT NULL,
  "availableRooms" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "RoomInventoryOverride_roomTypeId_stayDate_key"
  ON "RoomInventoryOverride"("roomTypeId", "stayDate");

CREATE INDEX "RoomInventoryOverride_roomTypeId_stayDate_idx"
  ON "RoomInventoryOverride"("roomTypeId", "stayDate");
