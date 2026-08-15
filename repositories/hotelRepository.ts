import { mockHotels } from '@/constants/hotelData';
import { prisma } from '@/lib/prisma';
import type { Hotel } from '@/types/hotel';

export interface HotelRepository {
  findAll(): Promise<Hotel[]>;
  findById(id: string): Promise<Hotel | undefined>;
  findBySlug(slug: string): Promise<Hotel | undefined>;
}

export class InMemoryHotelRepository implements HotelRepository {
  async findAll(): Promise<Hotel[]> {
    const managedProperties = await prisma.partnerProperty.findMany({
      include: {
        partner: { select: { name: true, status: true } },
        rooms: {
          include: { ratePlans: { orderBy: { createdAt: 'asc' }, where: { status: 'ACTIVE' } } },
          orderBy: { createdAt: 'asc' },
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { createdAt: 'desc' },
      where: {
        listingSource: 'MANAGED',
        publicationStatus: 'PUBLISHED',
        status: 'ACTIVE',
      },
    });
    const partnerHotels = managedProperties
      .filter((property) => property.partner.status === 'ACTIVE' && property.rooms.length > 0)
      .map((property): Hotel => {
        const parseList = (value: string) => {
          try {
            const parsed: unknown = JSON.parse(value);
            return Array.isArray(parsed)
              ? parsed.filter((item): item is string => typeof item === 'string')
              : [];
          } catch {
            return [];
          }
        };
        const amenityCategory = (name: string) => {
          const lower = name.toLowerCase();
          if (lower.includes('parking')) return 'parking' as const;
          if (lower.includes('breakfast') || lower.includes('restaurant'))
            return 'food-and-drink' as const;
          if (lower.includes('pool') || lower.includes('spa')) return 'pool-and-wellness' as const;
          if (lower.includes('airport') || lower.includes('shuttle')) return 'transport' as const;
          return 'general' as const;
        };
        const amenities = parseList(property.amenitiesJson).map((name, index) => ({
          category: amenityCategory(name),
          id: `managed-${property.id}-${index}`,
          name,
        }));
        return {
          amenities,
          checkInTime: property.checkInTime,
          checkOutTime: property.checkOutTime,
          description: property.description,
          id: `partner-hotel-${property.id}`,
          images: [
            { alt: `${property.displayName} property`, isPrimary: true, url: property.imageUrl },
            ...parseList(property.imageUrlsJson).map((url, index) => ({
              alt: `${property.displayName} gallery image ${index + 1}`,
              url,
            })),
          ],
          inventory: {
            externalPropertyId: property.id,
            source: 'supplier',
            supplierName: property.partner.name,
          },
          location: {
            address: {
              city: property.city,
              country: property.country,
              district: property.district || undefined,
              locality: property.locality || property.city,
              postalCode: property.postalCode || undefined,
              state: property.state || undefined,
              streetAddress: property.streetAddress || undefined,
              tehsil: property.tehsil || undefined,
            },
            latitude: property.latitude,
            longitude: property.longitude,
          },
          name: property.displayName,
          policies: parseList(property.policiesJson),
          propertyProfile: {
            childrenAllowed: property.childrenAllowed,
            contactEmail: property.contactEmail,
            contactPhone: property.contactPhone,
            languages: parseList(property.languagesJson),
            landmarks: parseList(property.landmarksJson),
            locationAliases: parseList(property.locationAliasesJson),
            minimumCheckInAge: property.minimumCheckInAge,
            petsAllowed: property.petsAllowed,
            propertyType: property.propertyType,
            smokingAllowed: property.smokingAllowed,
            timezone: property.timezone,
          },
          reviewSummary: { averageRating: 0, reviewCount: 0 },
          rooms: property.rooms.map((room) => ({
            amenities: parseList(room.amenitiesJson).map((name, index) => ({
              category: amenityCategory(name),
              id: `managed-${room.id}-${index}`,
              name,
            })),
            bedDescription: room.bedDescription,
            description: room.description,
            images: [
              {
                alt: `${room.name} at ${property.displayName}`,
                isPrimary: true,
                url: room.imageUrl,
              },
            ],
            inventoryCount: room.inventoryCount,
            isAvailable: true,
            name: room.name,
            occupancy: {
              maximumAdults: room.maximumAdults,
              maximumChildren: room.maximumChildren,
              maximumGuests: room.maximumGuests,
            },
            ratePlans: (room.ratePlans.length > 0 ? room.ratePlans : [{
              cancellationDescription: room.cancellationDescription,
              freeCancellationHours: 48,
              mealPlan: room.mealPlan,
              maximumStayNights: 30,
              minimumStayNights: 1,
              name: room.ratePlanName,
              nightlyRate: room.nightlyRate,
              ratePlanId: `rate-${room.roomTypeId}`,
              refundable: room.refundable,
              taxesAndFees: room.taxesAndFees,
            }]).map((ratePlan) => ({
                cancellationPolicy: {
                  description: ratePlan.cancellationDescription,
                  freeCancellationUntilHoursBeforeCheckIn: ratePlan.freeCancellationHours,
                  refundable: ratePlan.refundable,
                },
                id: ratePlan.ratePlanId,
                mealPlan: ratePlan.mealPlan as
                  'room-only' | 'breakfast-included' | 'half-board' | 'full-board',
                maximumStayNights: ratePlan.maximumStayNights,
                minimumStayNights: ratePlan.minimumStayNights,
                name: ratePlan.name,
                nightlyRate: { amount: ratePlan.nightlyRate, currency: 'INR' },
                taxesAndFees: { amount: ratePlan.taxesAndFees, currency: 'INR' },
              })),
            roomTypeId: room.roomTypeId,
          })),
          slug: property.hotelSlug,
          starRating: property.starRating as 1 | 2 | 3 | 4 | 5,
        };
      });
    return [...mockHotels, ...partnerHotels];
  }

  async findById(id: string): Promise<Hotel | undefined> {
    return (await this.findAll()).find((hotel) => hotel.id === id);
  }

  async findBySlug(slug: string): Promise<Hotel | undefined> {
    return (await this.findAll()).find((hotel) => hotel.slug === slug);
  }
}
