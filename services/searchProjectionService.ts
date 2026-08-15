import { normalizeSearchTerms, projectionVersion } from '@/lib/search/projection';
import { prisma } from '@/lib/prisma';

export async function rebuildHotelSearchProjections() {
  const properties = await prisma.partnerProperty.findMany({
    where: { status: 'ACTIVE', publicationStatus: 'PUBLISHED' },
    include: { rooms: { where: { status: 'ACTIVE' } } },
  });
  for (const property of properties) {
    let aliases: unknown = [];
    let amenities: unknown = [];
    try {
      aliases = JSON.parse(property.locationAliasesJson) as unknown;
      amenities = JSON.parse(property.amenitiesJson) as unknown;
    } catch {
      // Malformed optional legacy metadata is projected as empty.
    }
    const safeAliases = Array.isArray(aliases)
      ? aliases.filter((item): item is string => typeof item === 'string')
      : [];
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
    await prisma.searchProjectionDocument.upsert({
      where: { entityType_entityId: { entityType: 'HOTEL', entityId: property.id } },
      create: {
        entityType: 'HOTEL',
        entityId: property.id,
        searchTerms: normalizeSearchTerms([
          property.displayName,
          property.locality,
          property.tehsil,
          property.city,
          property.district,
          property.state,
          ...safeAliases,
        ]),
        facetsJson: JSON.stringify({ amenities, starRating: property.starRating }),
        payloadJson: JSON.stringify(payload),
        sourceVersion: projectionVersion({ property, rooms: property.rooms }),
      },
      update: {
        searchTerms: normalizeSearchTerms([
          property.displayName,
          property.locality,
          property.city,
          property.district,
          property.state,
          ...safeAliases,
        ]),
        facetsJson: JSON.stringify({ amenities, starRating: property.starRating }),
        payloadJson: JSON.stringify(payload),
        sourceVersion: projectionVersion({ property, rooms: property.rooms }),
        projectedAt: new Date(),
      },
    });
  }
  return { projected: properties.length };
}
