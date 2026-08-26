import {
  hotelProjectionSearchTerms,
  parseProjectionStringList,
  projectionVersion,
  staleHotelProjectionWhere,
} from '@/lib/search/projection';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { normalizeAdminSearchProjectionHealth } from '@/services/adminSearchProjectionRules';

export async function getHotelSearchProjectionHealth() {
  const [properties, projections] = await Promise.all([
    prisma.partnerProperty.findMany({
      where: { status: 'ACTIVE', publicationStatus: 'PUBLISHED' },
      include: { rooms: { where: { status: 'ACTIVE' } } },
    }),
    prisma.searchProjectionDocument.findMany({
      where: { entityType: 'HOTEL' },
      select: { entityId: true, projectedAt: true, sourceVersion: true },
    }),
  ]);
  const sources = new Map(
    properties.map((property) => [
      property.id,
      projectionVersion({ property, rooms: property.rooms }),
    ]),
  );
  let currentCount = 0;
  let outdatedCount = 0;
  for (const projection of projections) {
    const sourceVersion = sources.get(projection.entityId);
    if (!sourceVersion) continue;
    if (sourceVersion === projection.sourceVersion) currentCount += 1;
    else outdatedCount += 1;
  }
  const latestProjectedAt = projections.reduce<Date | null>(
    (latest, projection) =>
      !latest || projection.projectedAt > latest ? projection.projectedAt : latest,
    null,
  );
  const health = normalizeAdminSearchProjectionHealth({
    currentCount,
    latestProjectedAt,
    outdatedCount,
    projectedCount: projections.length,
    sourceCount: properties.length,
  });
  if (!health) throw new Error('SEARCH_PROJECTION_HEALTH_INVALID');
  return health;
}

export async function rebuildHotelSearchProjectionsInTransaction(
  transaction: Prisma.TransactionClient,
  options?: { maximumSourceCount?: number },
) {
  const properties = await transaction.partnerProperty.findMany({
    where: { status: 'ACTIVE', publicationStatus: 'PUBLISHED' },
    include: { rooms: { where: { status: 'ACTIVE' } } },
  });
  if (options?.maximumSourceCount !== undefined && properties.length > options.maximumSourceCount) {
    throw new Error('SEARCH_PROJECTION_SOURCE_LIMIT_EXCEEDED');
  }
  const projectedAt = new Date();
  for (const property of properties) {
    const aliases = parseProjectionStringList(property.locationAliasesJson);
    const amenities = parseProjectionStringList(property.amenitiesJson);
    const searchTerms = hotelProjectionSearchTerms({ ...property, aliases });
    const payload = {
      slug: property.hotelSlug,
      name: property.displayName,
      locality: property.locality,
      city: property.city,
      district: property.district,
      state: property.state,
      latitude: property.latitude,
      longitude: property.longitude,
      minimumNightlyRate: property.rooms.length
        ? Math.min(...property.rooms.map((room) => room.nightlyRate))
        : null,
    };
    const projection = {
      facetsJson: JSON.stringify({ amenities, starRating: property.starRating }),
      payloadJson: JSON.stringify(payload),
      searchTerms,
      sourceVersion: projectionVersion({ property, rooms: property.rooms }),
    };
    await transaction.searchProjectionDocument.upsert({
      where: { entityType_entityId: { entityType: 'HOTEL', entityId: property.id } },
      create: { entityType: 'HOTEL', entityId: property.id, ...projection },
      update: { ...projection, projectedAt },
    });
  }
  const removed = await transaction.searchProjectionDocument.deleteMany({
    where: staleHotelProjectionWhere(properties.map((property) => property.id)),
  });
  return { projected: properties.length, removed: removed.count, sourceCount: properties.length };
}

export async function rebuildHotelSearchProjections() {
  return prisma.$transaction(async (transaction) => {
    return rebuildHotelSearchProjectionsInTransaction(transaction);
  });
}
