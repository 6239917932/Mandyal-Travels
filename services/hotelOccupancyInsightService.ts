const DAY_MS = 86_400_000;

export type HotelOccupancyRoomType = {
  hotelSlug: string;
  inventoryCount: number;
  propertyName: string;
  roomTypeId: string;
};

export type HotelOccupancyInventoryDay = {
  availableRooms: number;
  roomTypeId: string;
  stayDate: string;
  stopSell: boolean;
};

export type HotelOccupancyBooking = {
  checkInDate: string;
  checkOutDate: string;
  hotelSlug: string;
  rooms: number;
};

export type HotelOccupancyInsight = {
  declaredRoomNights: number;
  hotelSlug: string;
  occupancyPercent: number | null;
  occupiedRoomNights: number;
  propertyName: string;
  recommendation: string;
  sellableRoomNights: number;
  stopSellRoomNights: number;
};

function dateRange(from: string, through: string): string[] {
  const first = Date.parse(`${from}T00:00:00Z`);
  const last = Date.parse(`${through}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) return [];

  const dates: string[] = [];
  for (let value = first; value <= last; value += DAY_MS) {
    dates.push(new Date(value).toISOString().slice(0, 10));
  }
  return dates;
}

function recommendation(occupied: number, declared: number, occupancyPercent: number | null) {
  if (declared === 0) {
    return 'Add active room capacity before using occupancy guidance.';
  }
  if (occupied > declared) {
    return 'Recorded room nights exceed declared capacity. Reconcile rooms, bookings, and inventory before changing rates.';
  }
  if (occupancyPercent !== null && occupancyPercent >= 80) {
    return 'High occupancy: review remaining availability and restrictions. Any rate change requires human approval.';
  }
  if (occupancyPercent !== null && occupancyPercent <= 30) {
    return 'Low occupancy: review listing content, availability, and approved promotions before considering a rate change.';
  }
  return 'Balanced occupancy: monitor booking pace and preserve current controls unless new evidence supports a change.';
}

export function buildHotelOccupancyInsights({
  bookings,
  from,
  inventoryDays,
  roomTypes,
  through,
}: {
  bookings: HotelOccupancyBooking[];
  from: string;
  inventoryDays: HotelOccupancyInventoryDay[];
  roomTypes: HotelOccupancyRoomType[];
  through: string;
}): HotelOccupancyInsight[] {
  const dates = dateRange(from, through);
  const overrideByRoomDate = new Map(
    inventoryDays.map((day) => [`${day.roomTypeId}:${day.stayDate}`, day]),
  );
  const propertySlugs = [...new Set(roomTypes.map((room) => room.hotelSlug))];

  return propertySlugs.map((hotelSlug) => {
    const propertyRooms = roomTypes.filter((room) => room.hotelSlug === hotelSlug);
    let declaredRoomNights = 0;
    let sellableRoomNights = 0;
    let stopSellRoomNights = 0;

    for (const room of propertyRooms) {
      for (const stayDate of dates) {
        const declared = Math.max(0, room.inventoryCount);
        const override = overrideByRoomDate.get(`${room.roomTypeId}:${stayDate}`);
        declaredRoomNights += declared;
        if (override?.stopSell) {
          stopSellRoomNights += declared;
        } else {
          sellableRoomNights += override
            ? Math.min(declared, Math.max(0, override.availableRooms))
            : declared;
        }
      }
    }

    const occupiedRoomNights = bookings
      .filter((booking) => booking.hotelSlug === hotelSlug)
      .reduce(
        (total, booking) =>
          total +
          dates.filter(
            (stayDate) => stayDate >= booking.checkInDate && stayDate < booking.checkOutDate,
          ).length *
            Math.max(0, booking.rooms),
        0,
      );
    const occupancyPercent = declaredRoomNights
      ? Math.round((occupiedRoomNights / declaredRoomNights) * 1_000) / 10
      : null;

    return {
      declaredRoomNights,
      hotelSlug,
      occupancyPercent,
      occupiedRoomNights,
      propertyName: propertyRooms[0]?.propertyName ?? hotelSlug,
      recommendation: recommendation(occupiedRoomNights, declaredRoomNights, occupancyPercent),
      sellableRoomNights,
      stopSellRoomNights,
    };
  });
}
