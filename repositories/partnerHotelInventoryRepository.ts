import { prisma } from '@/lib/prisma';
import {
  calculateHotelStayCharge,
  evaluateHotelStayInventory,
  hotelStayNights,
} from '@/lib/hotel/inventoryControls';

export type PartnerHotelStayControl = {
  availableRooms?: number;
  averageNightlyRate?: number;
  nightlyCharge?: number;
  stopSell: boolean;
  restrictionMessage?: string;
};

export class PartnerHotelInventoryRepository {
  async findStayControl(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    fallbackNightlyRate?: number,
    ratePlanId?: string,
  ): Promise<PartnerHotelStayControl> {
    const stayNights = hotelStayNights(startDate, endDate);
    if (!Number.isFinite(stayNights) || stayNights < 1) return { stopSell: true };
    const days = await prisma.partnerHotelInventoryDay.findMany({
      include: { property: { include: { partner: { select: { status: true } } } } },
      orderBy: { stayDate: 'asc' },
      where: { roomTypeId, stayDate: { gte: startDate, lte: endDate } },
    });
    const activeDays = days.filter(
      (day) => day.property.status === 'ACTIVE' && day.property.partner.status === 'ACTIVE',
    );
    if (!activeDays.length) return { stopSell: false };
    const stayDays = activeDays.filter((day) => day.stayDate < endDate);
    const inventory = evaluateHotelStayInventory(activeDays, startDate, endDate);
    const rateDays = ratePlanId && fallbackNightlyRate !== undefined
      ? await prisma.partnerRatePlanInventoryDay.findMany({
          orderBy: { stayDate: 'asc' },
          where: { ratePlan: { ratePlanId }, stayDate: { gte: startDate, lt: endDate } },
        })
      : [];
    const nightlyCharge =
      fallbackNightlyRate === undefined
        ? undefined
        : calculateHotelStayCharge(
            startDate,
            stayNights,
            fallbackNightlyRate,
            ratePlanId ? rateDays : stayDays,
          );
    return {
      availableRooms: inventory.availableRooms,
      averageNightlyRate: nightlyCharge === undefined ? undefined : nightlyCharge / stayNights,
      nightlyCharge,
      restrictionMessage: inventory.restrictionMessage,
      stopSell: inventory.stopSell,
    };
  }
}

export const partnerHotelInventoryRepository = new PartnerHotelInventoryRepository();
