import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  bookingAddonMultiplier,
  normalizeHotelBookingAddon,
  presentHotelBookingAddon,
} from '@/lib/pms/bookingAddons';
import type { HotelBookingAddonSelection, PriceComponent } from '@/types/commerce';

const MAX_PROPERTIES = 100;
const MAX_ADDONS = 500;

export class PartnerBookingAddonError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerBookingAddonWorkspace(partnerId: string) {
  const [properties, addons] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: MAX_PROPERTIES + 1,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelBookingAddon.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      take: MAX_ADDONS + 1,
      where: { property: { partnerId } },
    }),
  ]);
  return {
    addons: addons.slice(0, MAX_ADDONS),
    properties: properties.slice(0, MAX_PROPERTIES),
    safetyLimitReached: properties.length > MAX_PROPERTIES || addons.length > MAX_ADDONS,
  } as const;
}

export async function listAvailableHotelBookingAddons(
  hotelSlug: string,
  checkInDate: string,
  checkOutDate: string,
) {
  const addons = await prisma.hotelBookingAddon.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: 100,
    where: {
      property: { hotelSlug, publicationStatus: 'PUBLISHED', status: 'ACTIVE' },
      status: 'ACTIVE',
      AND: [
        { OR: [{ startsOn: '' }, { startsOn: { lte: checkInDate } }] },
        { OR: [{ endsOn: '' }, { endsOn: { gte: checkOutDate } }] },
      ],
    },
  });
  return addons.map(presentHotelBookingAddon);
}

export async function quoteHotelBookingAddons(input: {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelSlug: string;
  nights: number;
  rooms: number;
  selections?: HotelBookingAddonSelection[];
}): Promise<PriceComponent[]> {
  if (!input.selections?.length) return [];
  if (
    input.selections.length > 20 ||
    new Set(input.selections.map((item) => item.addonId)).size !== input.selections.length
  )
    throw new PartnerBookingAddonError('INVALID_ADDON_SELECTION', 'Choose each add-on only once.');
  const available = await listAvailableHotelBookingAddons(
    input.hotelSlug,
    input.checkInDate,
    input.checkOutDate,
  );
  const byId = new Map(available.map((addon) => [addon.id, addon]));
  const components: PriceComponent[] = [];
  for (const selection of input.selections) {
    const addon = byId.get(selection.addonId);
    if (
      !addon ||
      !Number.isSafeInteger(selection.quantity) ||
      selection.quantity < addon.minQuantity ||
      selection.quantity > addon.maxQuantity
    )
      throw new PartnerBookingAddonError(
        'ADDON_NOT_AVAILABLE',
        'One selected package is unavailable for these dates or quantity.',
      );
    const multiplier = bookingAddonMultiplier({
      adults: input.adults,
      children: input.children,
      nights: input.nights,
      pricingMode: addon.pricingMode,
      quantity: selection.quantity,
      rooms: input.rooms,
    });
    const amount = addon.unitAmount * multiplier;
    const tax = Math.round((amount * addon.taxRateBps) / 10_000);
    components.push({
      amount,
      currency: addon.currency,
      label: `${addon.name} · ${selection.quantity} selected · ${addon.pricingMode.toLowerCase().replaceAll('_', ' ')}`,
      pricingMode: addon.pricingMode,
      quantity: selection.quantity,
      sourceId: addon.id,
      taxRateBps: addon.taxRateBps,
      type: 'addon-charge',
      unitAmount: addon.unitAmount,
    });
    if (tax > 0)
      components.push({
        amount: tax,
        currency: addon.currency,
        label: `${addon.name} tax (${(addon.taxRateBps / 100).toFixed(2)}%)`,
        pricingMode: addon.pricingMode,
        quantity: selection.quantity,
        sourceId: addon.id,
        taxRateBps: addon.taxRateBps,
        type: 'addon-tax',
        unitAmount: addon.unitAmount,
      });
  }
  return components;
}

export async function createPartnerBookingAddon(input: {
  actorUserId: string;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeHotelBookingAddon(input.values);
  if (!values)
    throw new PartnerBookingAddonError('INVALID_ADDON', 'Enter valid package or add-on details.');
  const property = await prisma.partnerProperty.findFirst({
    select: { displayName: true, id: true },
    where: {
      id: input.propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property)
    throw new PartnerBookingAddonError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
  try {
    return await prisma.$transaction(async (transaction) => {
      const addon = await transaction.hotelBookingAddon.create({
        data: { ...values, propertyId: property.id },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'BOOKING_ADDON_CREATED',
          actorUserId: input.actorUserId,
          entityId: addon.id,
          entityType: 'HOTEL_BOOKING_ADDON',
          metadataJson: JSON.stringify({
            pricingMode: addon.pricingMode,
            propertyId: property.id,
            taxRateBps: addon.taxRateBps,
            unitAmount: addon.unitAmount,
          }),
          partnerId: input.partnerId,
          summary: `${addon.name} added to ${property.displayName}.`,
        },
      });
      return addon;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
      throw new PartnerBookingAddonError(
        'ADDON_NAME_EXISTS',
        'This property already has a package or add-on with that name.',
      );
    throw error;
  }
}

export async function changePartnerBookingAddonStatus(input: {
  actorUserId: string;
  addonId: string;
  expectedVersion: number;
  partnerId: string;
  status: string;
}) {
  if (!['ACTIVE', 'PAUSED'].includes(input.status))
    throw new PartnerBookingAddonError('INVALID_STATUS', 'Choose active or paused.');
  return prisma.$transaction(async (transaction) => {
    const addon = await transaction.hotelBookingAddon.findFirst({
      include: { property: { select: { displayName: true, partnerId: true } } },
      where: { id: input.addonId, property: { partnerId: input.partnerId } },
    });
    if (!addon)
      throw new PartnerBookingAddonError('ADDON_NOT_FOUND', 'The package or add-on was not found.');
    if (addon.status === input.status)
      throw new PartnerBookingAddonError('STATUS_UNCHANGED', 'The selected status is already set.');
    const updated = await transaction.hotelBookingAddon.updateMany({
      data: { status: input.status, version: { increment: 1 } },
      where: { id: addon.id, version: input.expectedVersion },
    });
    if (updated.count !== 1)
      throw new PartnerBookingAddonError(
        'STALE_ADDON',
        'This package changed after the page loaded. Refresh and retry.',
      );
    await transaction.partnerAuditLog.create({
      data: {
        action: `BOOKING_ADDON_${input.status}`,
        actorUserId: input.actorUserId,
        entityId: addon.id,
        entityType: 'HOTEL_BOOKING_ADDON',
        metadataJson: JSON.stringify({ fromStatus: addon.status, toStatus: input.status }),
        partnerId: input.partnerId,
        summary: `${addon.name} ${input.status === 'ACTIVE' ? 'activated' : 'paused'} for ${addon.property.displayName}.`,
      },
    });
    return { ...addon, status: input.status, version: addon.version + 1 };
  });
}
