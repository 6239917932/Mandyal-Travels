import { prisma } from '@/lib/prisma';

const DAY_MS = 86_400_000;
const nights = (start: string, end: string) =>
  Math.ceil(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / DAY_MS,
  );

export type PartnerHotelStayControl = {
  availableRooms?: number;
  averageNightlyRate?: number;
  nightlyCharge?: number;
  stopSell: boolean;
};

export class PartnerHotelInventoryRepository {
  async findStayControl(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    fallbackNightlyRate?: number,
  ): Promise<PartnerHotelStayControl> {
    const stayNights = nights(startDate, endDate);
    if (!Number.isFinite(stayNights) || stayNights < 1) return { stopSell: true };
    const days = await prisma.partnerHotelInventoryDay.findMany({
      include: { property: { include: { partner: { select: { status: true } } } } },
      orderBy: { stayDate: 'asc' },
      where: { roomTypeId, stayDate: { gte: startDate, lt: endDate } },
    });
    const activeDays = days.filter(
      (day) => day.property.status === 'ACTIVE' && day.property.partner.status === 'ACTIVE',
    );
    if (!activeDays.length) return { stopSell: false };
    const availableRooms = Math.min(
      ...activeDays.map((day) => (day.stopSell ? 0 : day.availableRooms)),
    );
    const nightlyCharge =
      fallbackNightlyRate === undefined
        ? undefined
        : Array.from({ length: stayNights }, (_, index) => {
            const date = new Date(new Date(`${startDate}T00:00:00Z`).getTime() + index * DAY_MS)
              .toISOString()
              .slice(0, 10);
            return (
              activeDays.find((day) => day.stayDate === date)?.nightlyRate ?? fallbackNightlyRate
            );
          }).reduce((total, amount) => total + amount, 0);
    return {
      availableRooms,
      averageNightlyRate: nightlyCharge === undefined ? undefined : nightlyCharge / stayNights,
      nightlyCharge,
      stopSell: activeDays.some((day) => day.stopSell),
    };
  }
}

export const partnerHotelInventoryRepository = new PartnerHotelInventoryRepository();
