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

type ManagedReservation = {
  quantity: number;
  roomTypeId: string;
  status: 'active' | 'converted' | 'expired' | 'released';
};

export function mergeManagedInventoryRecords(
  publicRecords: PartnerInventoryRecord[],
  managedRooms: ManagedRoom[],
  calendarDays: ManagedDay[],
  managedReservations: ManagedReservation[] = [],
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
    const roomReservations = managedReservations.filter(
      (reservation) => reservation.roomTypeId === room.roomTypeId,
    );
    const activeHolds = roomReservations
      .filter((reservation) => reservation.status === 'active')
      .reduce((total, reservation) => total + reservation.quantity, 0);
    const allocatedRooms = roomReservations
      .filter((reservation) => reservation.status === 'converted')
      .reduce((total, reservation) => total + reservation.quantity, 0);
    records.push({
      activeHolds,
      allocatedRooms,
      baseInventory: room.inventoryCount,
      effectiveInventory,
      hotelName: room.hotelName,
      inventorySource: 'MANAGED_PMS',
      overrideApplied: controls.length > 0,
      remainingRooms: Math.max(0, effectiveInventory - activeHolds - allocatedRooms),
      roomName: room.roomName,
      roomTypeId: room.roomTypeId,
    });
  }
  return records;
}
