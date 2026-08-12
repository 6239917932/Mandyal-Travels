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
        rooms: { orderBy: { createdAt: 'asc' }, where: { status: 'ACTIVE' } },
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
              postalCode: property.postalCode || undefined,
              state: property.state || undefined,
              streetAddress: property.streetAddress || undefined,
            },
            latitude: property.latitude,
            longitude: property.longitude,
          },
          name: property.displayName,
          policies: parseList(property.policiesJson),
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
            ratePlans: [
              {
                cancellationPolicy: {
                  description: room.cancellationDescription,
                  refundable: room.refundable,
                },
                id: `rate-${room.roomTypeId}`,
                mealPlan: room.mealPlan as
                  'room-only' | 'breakfast-included' | 'half-board' | 'full-board',
                name: room.ratePlanName,
                nightlyRate: { amount: room.nightlyRate, currency: 'INR' },
                taxesAndFees: { amount: room.taxesAndFees, currency: 'INR' },
              },
            ],
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
