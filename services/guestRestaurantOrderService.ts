import 'server-only';

import { getAuthorizedManagedBooking } from '@/lib/managedBooking';
import { prisma } from '@/lib/prisma';
import {
  createPartnerHotelPosOrder,
  PartnerHotelPosError,
} from '@/services/partnerHotelPosService';

const MAX_MENU_ITEMS = 250;

type RequestedItem = { menuItemId?: unknown; quantity?: unknown };

function normalizeRequestedItems(value: unknown): Array<{ menuItemId: string; quantity: number }> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw new PartnerHotelPosError('INVALID_ITEMS', 'Choose between one and twenty menu items.');
  }
  const seen = new Set<string>();
  return value.map((item) => {
    const record = (item ?? {}) as RequestedItem;
    const menuItemId = typeof record.menuItemId === 'string' ? record.menuItemId.trim() : '';
    const quantity = Number(record.quantity);
    if (
      !menuItemId ||
      seen.has(menuItemId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      throw new PartnerHotelPosError(
        'INVALID_ITEMS',
        'Choose each available menu item once with a quantity from 1 to 20.',
      );
    }
    seen.add(menuItemId);
    return { menuItemId, quantity };
  });
}

async function requireCheckedInBooking(confirmationCode: string) {
  const booking = await getAuthorizedManagedBooking(confirmationCode);
  if (!booking || booking.status !== 'confirmed' || booking.operationalStatus !== 'CHECKED_IN') {
    throw new PartnerHotelPosError(
      'CHECKED_IN_STAY_REQUIRED',
      'Sign in with the guest account for a currently checked-in stay.',
    );
  }
  const property = await prisma.partnerProperty.findFirst({
    select: { displayName: true, id: true, partnerId: true },
    where: {
      hotelSlug: booking.hotelSlug,
      listingSource: 'MANAGED',
      status: 'ACTIVE',
    },
  });
  if (!property) {
    throw new PartnerHotelPosError(
      'PROPERTY_NOT_FOUND',
      'Restaurant ordering is not active for this property.',
    );
  }
  return { booking, property } as const;
}

export async function getGuestRestaurantOrderWorkspace(confirmationCode: string) {
  const { booking, property } = await requireCheckedInBooking(confirmationCode);
  const outlets = await prisma.hotelRestaurantOutlet.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      serviceArea: true,
      menuItems: {
        orderBy: [{ category: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        select: {
          category: true,
          currency: true,
          description: true,
          id: true,
          name: true,
          unitPrice: true,
          vegetarian: true,
        },
        take: MAX_MENU_ITEMS + 1,
        where: { status: 'ACTIVE' },
      },
    },
    where: { partnerId: property.partnerId, propertyId: property.id, status: 'ACTIVE' },
  });
  return {
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
    hotelName: property.displayName,
    outlets: outlets.map((outlet) => ({
      ...outlet,
      menuItems: outlet.menuItems.slice(0, MAX_MENU_ITEMS),
    })),
    safetyLimitReached: outlets.some((outlet) => outlet.menuItems.length > MAX_MENU_ITEMS),
  } as const;
}

export async function createGuestRestaurantOrder(input: {
  confirmationCode: string;
  idempotencyKey: string;
  items: unknown;
  note: unknown;
  outletId: unknown;
}) {
  const { booking, property } = await requireCheckedInBooking(input.confirmationCode);
  const outletId = typeof input.outletId === 'string' ? input.outletId.trim() : '';
  const requested = normalizeRequestedItems(input.items);
  const outlet = await prisma.hotelRestaurantOutlet.findFirst({
    select: {
      id: true,
      name: true,
      menuItems: {
        select: { id: true, name: true, unitPrice: true },
        where: { id: { in: requested.map((item) => item.menuItemId) }, status: 'ACTIVE' },
      },
    },
    where: {
      id: outletId,
      partnerId: property.partnerId,
      propertyId: property.id,
      status: 'ACTIVE',
    },
  });
  if (!outlet || outlet.menuItems.length !== requested.length) {
    throw new PartnerHotelPosError(
      'MENU_CHANGED',
      'The restaurant menu changed. Refresh the page and choose available items again.',
    );
  }
  const menuById = new Map(outlet.menuItems.map((item) => [item.id, item]));
  const items = requested.map((item) => {
    const menuItem = menuById.get(item.menuItemId);
    if (!menuItem) throw new PartnerHotelPosError('MENU_CHANGED', 'Refresh the restaurant menu.');
    return { name: menuItem.name, quantity: item.quantity, unitPrice: menuItem.unitPrice };
  });
  return createPartnerHotelPosOrder({
    actorUserId: `GUEST_BOOKING:${booking.id}`,
    confirmationCode: booking.confirmationCode,
    idempotencyKey: input.idempotencyKey,
    items,
    note: input.note,
    outletName: outlet.name,
    partnerId: property.partnerId,
    propertyId: property.id,
    serviceMode: 'OUTLET',
  });
}
