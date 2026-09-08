export type AttendantQueueState =
  | 'OUT_OF_SERVICE'
  | 'URGENT_MAINTENANCE'
  | 'DIRTY'
  | 'CLEANING'
  | 'INSPECTION_REQUIRED'
  | 'READY'
  | 'NEEDS_REVIEW';

type AttendantInspectionInput = Readonly<{
  businessDate: string;
  id: string;
  inspectedAt: Date;
  note: string;
  result: string;
}>;

type AttendantRoomInput = Readonly<{
  floorLabel: string;
  housekeepingInspections: readonly AttendantInspectionInput[];
  housekeepingStatus: string;
  id: string;
  notes: string;
  operationalStatus: string;
  property: Readonly<{ displayName: string }>;
  propertyId: string;
  roomNumber: string;
  roomType: Readonly<{ name: string }>;
  roomTypeId: string;
}>;

type AttendantWorkOrderInput = Readonly<{
  physicalRoomId: string;
  priority: string;
  status: string;
}>;

export type AttendantQueueRoom = Readonly<{
  activeWorkOrders: number;
  floorLabel: string;
  housekeepingStatus: string;
  id: string;
  latestInspection?: AttendantInspectionInput;
  notes: string;
  operationalStatus: string;
  propertyId: string;
  propertyName: string;
  queueState: AttendantQueueState;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  urgentWorkOrders: number;
}>;

const queueRank: Readonly<Record<AttendantQueueState, number>> = {
  OUT_OF_SERVICE: 0,
  URGENT_MAINTENANCE: 1,
  DIRTY: 2,
  CLEANING: 3,
  INSPECTION_REQUIRED: 4,
  NEEDS_REVIEW: 5,
  READY: 6,
};

function latestInspection(inspections: readonly AttendantInspectionInput[]) {
  return [...inspections].sort(
    (left, right) => right.inspectedAt.getTime() - left.inspectedAt.getTime(),
  )[0];
}

function resolveQueueState(input: {
  housekeepingStatus: string;
  latestInspection?: AttendantInspectionInput;
  operationalStatus: string;
  urgentWorkOrders: number;
}): AttendantQueueState {
  if (input.operationalStatus === 'OUT_OF_SERVICE') return 'OUT_OF_SERVICE';
  if (input.operationalStatus !== 'ACTIVE') return 'NEEDS_REVIEW';
  if (input.urgentWorkOrders > 0) return 'URGENT_MAINTENANCE';
  if (input.housekeepingStatus === 'DIRTY') return 'DIRTY';
  if (input.housekeepingStatus === 'CLEANING') return 'CLEANING';
  if (input.latestInspection?.result === 'FAILED') return 'INSPECTION_REQUIRED';
  if (input.housekeepingStatus === 'READY') return 'READY';
  return 'NEEDS_REVIEW';
}

export function buildAttendantQueue(
  rooms: readonly AttendantRoomInput[],
  workOrders: readonly AttendantWorkOrderInput[],
): readonly AttendantQueueRoom[] {
  const activeOrders = new Map<string, { active: number; urgent: number }>();
  for (const order of workOrders) {
    if (order.status !== 'OPEN' && order.status !== 'IN_PROGRESS') continue;
    const current = activeOrders.get(order.physicalRoomId) ?? { active: 0, urgent: 0 };
    current.active += 1;
    if (order.priority === 'URGENT') current.urgent += 1;
    activeOrders.set(order.physicalRoomId, current);
  }

  return rooms
    .map((room): AttendantQueueRoom => {
      const inspection = latestInspection(room.housekeepingInspections);
      const orders = activeOrders.get(room.id) ?? { active: 0, urgent: 0 };
      return {
        activeWorkOrders: orders.active,
        floorLabel: room.floorLabel,
        housekeepingStatus: room.housekeepingStatus,
        id: room.id,
        latestInspection: inspection,
        notes: room.notes,
        operationalStatus: room.operationalStatus,
        propertyId: room.propertyId,
        propertyName: room.property.displayName,
        queueState: resolveQueueState({
          housekeepingStatus: room.housekeepingStatus,
          latestInspection: inspection,
          operationalStatus: room.operationalStatus,
          urgentWorkOrders: orders.urgent,
        }),
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomType.name,
        urgentWorkOrders: orders.urgent,
      };
    })
    .sort(
      (left, right) =>
        queueRank[left.queueState] - queueRank[right.queueState] ||
        left.propertyName.localeCompare(right.propertyName, 'en-IN') ||
        left.roomNumber.localeCompare(right.roomNumber, 'en-IN', { numeric: true }),
    );
}

export function attendantQueueLabel(state: AttendantQueueState): string {
  return state.toLowerCase().replaceAll('_', ' ');
}
