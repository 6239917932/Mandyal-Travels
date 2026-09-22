export type HotelStayStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';

export type StayRuleViolation = { code: string; message: string };

export type PhysicalRoomCandidate = {
  housekeepingStatus: string;
  operationalStatus: string;
  roomNumber: string;
};

export function evaluateStayTiming(input: {
  calendarDate?: string;
  checkInDate: string;
  checkOutDate: string;
  operationalDate: string;
  nextStatus: HotelStayStatus;
}): StayRuleViolation | undefined {
  if (
    (input.nextStatus === 'CHECKED_IN' || input.nextStatus === 'NO_SHOW') &&
    input.operationalDate < input.checkInDate
  ) {
    const action = input.nextStatus.toLowerCase().replaceAll('_', ' ');
    const isOperationalDateBehind =
      input.calendarDate !== undefined &&
      input.calendarDate >= input.checkInDate &&
      input.operationalDate < input.calendarDate;
    return {
      code: isOperationalDateBehind ? 'OPERATIONAL_DATE_BEHIND' : 'ARRIVAL_NOT_DUE',
      message: isOperationalDateBehind
        ? `The property's operational date is ${input.operationalDate}. Complete night audit to advance it before marking this stay ${action} for ${input.checkInDate}.`
        : `This stay cannot be marked ${action} before ${input.checkInDate} in the property's timezone.`,
    };
  }
  if (input.nextStatus === 'CHECKED_IN' && input.operationalDate >= input.checkOutDate) {
    return {
      code: 'STAY_DATE_PASSED',
      message: 'The scheduled stay has already ended and cannot be checked in.',
    };
  }
  return undefined;
}

export function evaluateStayTransition(
  currentStatus: string,
  nextStatus: HotelStayStatus,
): StayRuleViolation | undefined {
  const permittedTransitions: Readonly<Record<string, readonly HotelStayStatus[]>> = {
    CHECKED_IN: ['CHECKED_OUT'],
    RESERVED: ['CHECKED_IN', 'NO_SHOW'],
  };
  if (!permittedTransitions[currentStatus]?.includes(nextStatus)) {
    return {
      code: 'INVALID_STAY_TRANSITION',
      message: `The stay cannot move from ${currentStatus} to ${nextStatus}.`,
    };
  }
  return undefined;
}

export function normalizeRoomAssignments(
  assignedRoomNumbers: readonly string[],
  requiredRooms: number,
): { roomNumbers: string[]; violation?: StayRuleViolation } {
  const roomNumbers = [
    ...new Set(
      assignedRoomNumbers
        .map((roomNumber) => roomNumber.trim().replace(/\s+/g, ' ').slice(0, 20))
        .filter(Boolean),
    ),
  ];
  if (
    roomNumbers.length !== requiredRooms ||
    roomNumbers.some((roomNumber) => !/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{0,19}$/.test(roomNumber))
  ) {
    return {
      roomNumbers,
      violation: {
        code: 'INVALID_ROOM_ASSIGNMENT',
        message: `Assign ${requiredRooms} unique physical room number${requiredRooms === 1 ? '' : 's'} before check-in.`,
      },
    };
  }
  return { roomNumbers };
}

export function availablePhysicalRooms<T extends PhysicalRoomCandidate>(
  rooms: readonly T[],
  occupiedRoomNumbers: ReadonlySet<string>,
): T[] {
  return rooms.filter(
    (room) =>
      room.housekeepingStatus === 'READY' &&
      room.operationalStatus === 'ACTIVE' &&
      !occupiedRoomNumbers.has(room.roomNumber),
  );
}
