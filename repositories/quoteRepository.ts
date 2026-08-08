import type { HotelQuote } from '@/types/commerce';
import { prisma } from '@/lib/prisma';

export interface QuoteRepository {
  findById(id: string): Promise<HotelQuote | undefined>;
  save(quote: HotelQuote): Promise<void>;
}

export class InMemoryQuoteRepository implements QuoteRepository {
  private readonly quotes = new Map<string, HotelQuote>();

  async findById(id: string): Promise<HotelQuote | undefined> {
    return this.quotes.get(id);
  }

  async save(quote: HotelQuote): Promise<void> {
    this.quotes.set(quote.id, quote);
  }
}

export class PrismaQuoteRepository implements QuoteRepository {
  async findById(id: string): Promise<HotelQuote | undefined> {
    const quote = await prisma.hotelQuote.findUnique({
      include: { availabilityLock: true, components: true },
      where: { id },
    });

    if (!quote) {
      return undefined;
    }

    return {
      availabilityLock: {
        checkInDate: quote.availabilityLock.checkInDate,
        checkOutDate: quote.availabilityLock.checkOutDate,
        expiresAt: quote.availabilityLock.expiresAt.toISOString(),
        id: quote.availabilityLock.id,
        inventorySource: quote.availabilityLock
          .inventorySource as HotelQuote['availabilityLock']['inventorySource'],
        quantity: quote.availabilityLock.quantity,
        roomTypeId: quote.availabilityLock.roomTypeId,
        status: quote.availabilityLock.status as HotelQuote['availabilityLock']['status'],
      },
      checkInDate: quote.checkInDate,
      checkOutDate: quote.checkOutDate,
      components: quote.components.map((component) => ({
        amount: component.amount,
        currency: component.currency as HotelQuote['currency'],
        label: component.label,
        type: component.type as HotelQuote['components'][number]['type'],
      })),
      currency: quote.currency as HotelQuote['currency'],
      expiresAt: quote.expiresAt.toISOString(),
      hotelSlug: quote.hotelSlug,
      id: quote.id,
      nights: quote.nights,
      quotedAt: quote.quotedAt.toISOString(),
      ratePlanId: quote.ratePlanId,
      rooms: quote.rooms,
      totalAmount: quote.totalAmount,
    };
  }

  async save(quote: HotelQuote): Promise<void> {
    await prisma.hotelQuote.create({
      data: {
        availabilityLockId: quote.availabilityLock.id,
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        components: {
          create: quote.components.map((component) => ({
            amount: component.amount,
            currency: component.currency,
            label: component.label,
            type: component.type,
          })),
        },
        currency: quote.currency,
        expiresAt: new Date(quote.expiresAt),
        hotelSlug: quote.hotelSlug,
        id: quote.id,
        nights: quote.nights,
        quotedAt: new Date(quote.quotedAt),
        ratePlanId: quote.ratePlanId,
        rooms: quote.rooms,
        totalAmount: quote.totalAmount,
      },
    });
  }
}

export const quoteRepository = new PrismaQuoteRepository();
