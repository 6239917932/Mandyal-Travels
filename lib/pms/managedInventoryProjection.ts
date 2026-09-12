import type { PartnerInventoryRecord } from '@/types/commerce';

type ManagedRoom = {
  hotelName: string;
  inventoryCount: number;
  roomName: string;
  roomTypeId: string;
};

type ManagedDay = {
  availableRooms: number;
  roomTypeId: string;
  stopSell: boolean;
};

export function mergeManagedInventoryRecords(
  publicRecords: PartnerInventoryRecord[],
  managedRooms: ManagedRoom[],
  calendarDays: ManagedDay[],
): PartnerInventoryRecord[] {
  const records = [...publicRecords];
  const knownRoomIds = new Set(publicRecords.map((record) => record.roomTypeId));
  for (const room of managedRooms) {
    if (knownRoomIds.has(room.roomTypeId)) continue;
    const controls = calendarDays.filter((day) => day.roomTypeId === room.roomTypeId);
    const effectiveInventory = controls.length
      ? Math.min(
          room.inventoryCount,
          ...controls.map((day) => (day.stopSell ? 0 : day.availableRooms)),
        )
      : room.inventoryCount;
    records.push({
      activeHolds: 0,
      allocatedRooms: 0,
      baseInventory: room.inventoryCount,
      effectiveInventory,
      hotelName: room.hotelName,
      inventorySource: 'MANAGED_PMS',
      overrideApplied: controls.length > 0,
      remainingRooms: effectiveInventory,
      roomName: room.roomName,
      roomTypeId: room.roomTypeId,
    });
  }
  return records;
}
