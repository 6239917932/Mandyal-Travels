import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  hotelVendorRequestFingerprint,
  normalizeHotelVendor,
  normalizeHotelVendorStatus,
} from '@/lib/pms/vendorManagement';

const MAX_PROPERTIES = 100;
const MAX_VENDORS = 500;
const MAX_EVENTS = 500;

export class PartnerVendorError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerVendorWorkspace(partnerId: string) {
  const [properties, vendors, events] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: MAX_PROPERTIES + 1,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelVendor.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { legalName: 'asc' }, { id: 'asc' }],
      take: MAX_VENDORS + 1,
      where: { partnerId },
    }),
    prisma.hotelVendorEvent.findMany({
      include: {
        property: { select: { displayName: true } },
        vendor: { select: { legalName: true, vendorCode: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_EVENTS + 1,
      where: { partnerId },
    }),
  ]);
  return {
    events: events.slice(0, MAX_EVENTS),
    properties: properties.slice(0, MAX_PROPERTIES),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES ||
      vendors.length > MAX_VENDORS ||
      events.length > MAX_EVENTS,
    vendors: vendors.slice(0, MAX_VENDORS),
  } as const;
}

export async function createPartnerVendor(input: {
  actorUserId: string;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeHotelVendor(input.values);
  if (!values) throw new PartnerVendorError('INVALID_VENDOR', 'Enter valid vendor details.');
  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: input.propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property)
    throw new PartnerVendorError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
  try {
    return await prisma.$transaction(async (transaction) => {
      const vendor = await transaction.hotelVendor.create({
        data: {
          ...values,
          createdByUserId: input.actorUserId,
          partnerId: input.partnerId,
          propertyId: property.id,
        },
      });
      const event = {
        fromStatus: 'NONE',
        note: 'Vendor registered in the controlled property directory.',
        toStatus: vendor.status,
        vendorId: vendor.id,
        version: vendor.version,
      };
      await transaction.hotelVendorEvent.create({
        data: {
          ...event,
          action: 'REGISTERED',
          actorUserId: input.actorUserId,
          idempotencyKey: `hotel-vendor-opening-${vendor.id}`,
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint: hotelVendorRequestFingerprint(event),
        },
      });
      return vendor;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new PartnerVendorError(
        'VENDOR_CODE_EXISTS',
        'This property already has that vendor code.',
      );
    }
    throw error;
  }
}

export async function changePartnerVendorStatus(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeHotelVendorStatus(input.values);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!values || idempotencyKey.length < 16 || idempotencyKey.length > 120) {
    throw new PartnerVendorError(
      'INVALID_VENDOR_ACTION',
      'Enter a valid status, reason, and retry key.',
    );
  }
  const fingerprint = hotelVendorRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelVendorEvent.findUnique({ where: { idempotencyKey } });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint) {
        throw new PartnerVendorError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another vendor action.',
        );
      }
      return replay;
    }
    const vendor = await transaction.hotelVendor.findFirst({
      where: { id: values.vendorId, partnerId: input.partnerId },
    });
    if (!vendor) throw new PartnerVendorError('VENDOR_NOT_FOUND', 'The vendor was not found.');
    if (vendor.status === values.status) {
      throw new PartnerVendorError(
        'STATUS_UNCHANGED',
        `The vendor is already ${values.status.toLowerCase()}.`,
      );
    }
    const updated = await transaction.hotelVendor.updateMany({
      data: { status: values.status, version: { increment: 1 } },
      where: { id: vendor.id, partnerId: input.partnerId, version: values.expectedVersion },
    });
    if (updated.count !== 1) {
      throw new PartnerVendorError(
        'STALE_VENDOR',
        'The vendor changed after this page loaded. Refresh and retry.',
      );
    }
    return transaction.hotelVendorEvent.create({
      data: {
        action: values.status === 'ACTIVE' ? 'ACTIVATED' : 'PAUSED',
        actorUserId: input.actorUserId,
        fromStatus: vendor.status,
        idempotencyKey,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: vendor.propertyId,
        requestFingerprint: fingerprint,
        toStatus: values.status,
        vendorId: vendor.id,
        version: vendor.version + 1,
      },
    });
  });
}
