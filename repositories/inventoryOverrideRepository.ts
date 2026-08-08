import { prisma } from '@/lib/prisma';

function enumerateNights(checkInDate: string, checkOutDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${checkInDate}T00:00:00Z`);
  const end = new Date(`${checkOutDate}T00:00:00Z`);
  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export interface InventoryOverrideRepository {
  findLimitForStay(
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<number | undefined>;
  setRange(input: {
    availableRooms: number;
    checkInDate: string;
    checkOutDate: string;
    note: string;
    roomTypeId: string;
  }): Promise<void>;
}

export class PrismaInventoryOverrideRepository implements InventoryOverrideRepository {
  async findLimitForStay(
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<number | undefined> {
    const overrides = await prisma.roomInventoryOverride.findMany({
      where: { roomTypeId, stayDate: { gte: checkInDate, lt: checkOutDate } },
    });
    if (overrides.length === 0) return undefined;
    return Math.min(...overrides.map((override) => override.availableRooms));
  }

  async setRange(input: {
    availableRooms: number;
    checkInDate: string;
    checkOutDate: string;
    note: string;
    roomTypeId: string;
  }): Promise<void> {
    const dates = enumerateNights(input.checkInDate, input.checkOutDate);
    await prisma.$transaction(
      dates.map((stayDate) =>
        prisma.roomInventoryOverride.upsert({
          create: {
            availableRooms: input.availableRooms,
            id: crypto.randomUUID(),
            note: input.note,
            roomTypeId: input.roomTypeId,
            stayDate,
          },
          update: { availableRooms: input.availableRooms, note: input.note },
          where: { roomTypeId_stayDate: { roomTypeId: input.roomTypeId, stayDate } },
        }),
      ),
    );
  }
}

export const inventoryOverrideRepository = new PrismaInventoryOverrideRepository();
