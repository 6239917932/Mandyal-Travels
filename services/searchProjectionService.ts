import {
  hotelProjectionSearchTerms,
  parseProjectionStringList,
  projectionVersion,
  staleHotelProjectionWhere,
} from '@/lib/search/projection';
import { prisma } from '@/lib/prisma';

export async function rebuildHotelSearchProjections() {
  return prisma.$transaction(async (transaction) => {
    const properties = await transaction.partnerProperty.findMany({
      where: { status: 'ACTIVE', publicationStatus: 'PUBLISHED' },
      include: { rooms: { where: { status: 'ACTIVE' } } },
    });
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
    return { projected: properties.length, removed: removed.count };
  });
}
