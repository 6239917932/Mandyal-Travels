import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  fixedAssetRequestFingerprint,
  normalizeFixedAsset,
  normalizeFixedAssetEvent,
} from '@/lib/pms/fixedAssets';

const MAX_ASSETS = 500;
const MAX_EVENTS = 500;

export class PartnerFixedAssetError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerFixedAssetWorkspace(partnerId: string) {
  const [properties, assets, events] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: 100,
      where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelFixedAsset.findMany({
      include: { property: { select: { displayName: true } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: MAX_ASSETS + 1,
      where: { partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelFixedAssetEvent.findMany({
      include: {
        asset: { select: { assetTag: true, name: true } },
        property: { select: { displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_EVENTS + 1,
      where: { partnerId },
    }),
  ]);
  return {
    assets: assets.slice(0, MAX_ASSETS),
    events: events.slice(0, MAX_EVENTS),
    properties,
    safetyLimitReached: assets.length > MAX_ASSETS || events.length > MAX_EVENTS,
  } as const;
}

export async function createPartnerFixedAsset(input: {
  actorUserId: string;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeFixedAsset(input.values);
  if (!values)
    throw new PartnerFixedAssetError('INVALID_FIXED_ASSET', 'Enter valid asset details.');
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
    throw new PartnerFixedAssetError('PROPERTY_NOT_FOUND', 'The managed property was not found.');
  try {
    return await prisma.$transaction(async (transaction) => {
      const asset = await transaction.hotelFixedAsset.create({
        data: { ...values, partnerId: input.partnerId, propertyId: property.id },
      });
      const event = {
        assetId: asset.id,
        eventType: 'REGISTERED',
        note: `Registered against invoice ${values.invoiceReference}.`,
      };
      await transaction.hotelFixedAssetEvent.create({
        data: {
          ...event,
          actorUserId: input.actorUserId,
          idempotencyKey: `fixed-asset-opening-${asset.id}`,
          partnerId: input.partnerId,
          propertyId: property.id,
          requestFingerprint: fixedAssetRequestFingerprint(event),
          resultingStatus: asset.status,
        },
      });
      return asset;
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new PartnerFixedAssetError(
        'ASSET_TAG_EXISTS',
        'This property already has that asset tag.',
      );
    }
    throw error;
  }
}

export async function recordPartnerFixedAssetEvent(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const values = normalizeFixedAssetEvent(input.values);
  if (!values || input.idempotencyKey.trim().length < 16 || input.idempotencyKey.length > 120) {
    throw new PartnerFixedAssetError(
      'INVALID_FIXED_ASSET_EVENT',
      'Enter a valid action, note, and retry key.',
    );
  }
  const fingerprint = fixedAssetRequestFingerprint({ partnerId: input.partnerId, ...values });
  return prisma.$transaction(async (transaction) => {
    const replay = await transaction.hotelFixedAssetEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay) {
      if (replay.partnerId !== input.partnerId || replay.requestFingerprint !== fingerprint) {
        throw new PartnerFixedAssetError(
          'IDEMPOTENCY_CONFLICT',
          'That retry key belongs to another asset action.',
        );
      }
      return replay;
    }
    const asset = await transaction.hotelFixedAsset.findFirst({
      where: { id: values.assetId, partnerId: input.partnerId, status: 'ACTIVE' },
    });
    if (!asset)
      throw new PartnerFixedAssetError('FIXED_ASSET_NOT_FOUND', 'The active asset was not found.');
    const data =
      values.eventType === 'MOVED'
        ? { custodian: values.custodian, location: values.location }
        : { lastVerifiedAt: new Date() };
    const updated = await transaction.hotelFixedAsset.updateMany({
      data: { ...data, version: { increment: 1 } },
      where: { id: asset.id, partnerId: input.partnerId, version: values.expectedVersion },
    });
    if (updated.count !== 1)
      throw new PartnerFixedAssetError(
        'STALE_FIXED_ASSET',
        'The asset changed after this page loaded. Refresh and retry.',
      );
    return transaction.hotelFixedAssetEvent.create({
      data: {
        actorUserId: input.actorUserId,
        assetId: asset.id,
        eventType: values.eventType,
        idempotencyKey: input.idempotencyKey,
        note: values.note,
        partnerId: input.partnerId,
        propertyId: asset.propertyId,
        requestFingerprint: fingerprint,
        resultingStatus: asset.status,
      },
    });
  });
}
