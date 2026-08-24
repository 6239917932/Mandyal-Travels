import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
  CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE,
  customerTravelHistoryDate,
  customerTravelHistoryHotelName,
  customerTravelHistoryHotelReference,
  customerTravelHistoryMoney,
  customerTravelHistoryPagination,
  customerTravelHistoryStatus,
  customerTravelHistoryText,
  customerTravelHistoryTransportDocument,
  customerTravelHistoryTransportReference,
} from '@/services/customerTravelHistoryRules';
import type {
  CustomerTravelHistoryDirectory,
  CustomerTravelHistoryEntry,
  CustomerTravelHistoryPage,
} from '@/types/customerTravelHistory';

type OwnedId = Readonly<{ id: string }>;

function emptyPage(): CustomerTravelHistoryPage {
  return { count: 0, entries: [], isCapped: false, page: 1, pages: 1 };
}

export async function getCustomerTravelHistory(input: {
  hotelPage: number;
  sessionEmail: string;
  transportPage: number;
  userId: string;
}): Promise<CustomerTravelHistoryDirectory> {
  const userId = input.userId.trim();
  const sessionEmail = normalizeEmail(input.sessionEmail);
  if (!userId || !sessionEmail) return { hotels: emptyPage(), transport: emptyPage() };

  return prisma.$transaction(async (transaction) => {
    const [ownedTransport, ownedHotels] = await Promise.all([
      transaction.$queryRaw<OwnedId[]>`
        SELECT trip."id" AS "id"
        FROM "CustomerTrip" AS trip
        WHERE trip."productType" IN ('FLIGHT', 'BUS', 'CAR')
          AND (
            trip."userId" = ${userId}
            OR (
              trip."userId" IS NULL
              AND LOWER(TRIM(trip."email")) = ${sessionEmail}
            )
          )
        ORDER BY trip."createdAt" DESC, trip."id" DESC
        LIMIT ${CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT + 1}
      `,
      transaction.$queryRaw<OwnedId[]>`
        SELECT booking."id" AS "id"
        FROM "Booking" AS booking
        INNER JOIN "BookingGuest" AS guest ON guest."bookingId" = booking."id"
        WHERE LOWER(TRIM(guest."email")) = ${sessionEmail}
        ORDER BY booking."createdAt" DESC, booking."id" DESC
        LIMIT ${CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT + 1}
      `,
    ]);

    const transportIds = ownedTransport
      .slice(0, CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT)
      .map(({ id }) => id);
    const hotelIds = ownedHotels
      .slice(0, CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT)
      .map(({ id }) => id);
    const transportPaging = customerTravelHistoryPagination(
      input.transportPage,
      transportIds.length,
    );
    const hotelPaging = customerTravelHistoryPagination(input.hotelPage, hotelIds.length);
    const selectedTransportIds = transportIds.slice(
      transportPaging.skip,
      transportPaging.skip + CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE,
    );
    const selectedHotelIds = hotelIds.slice(
      hotelPaging.skip,
      hotelPaging.skip + CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE,
    );

    const [transportRows, hotelRows] = await Promise.all([
      transaction.customerTrip.findMany({
        select: {
          confirmationCode: true,
          currency: true,
          detailsJson: true,
          endDate: true,
          id: true,
          productType: true,
          startDate: true,
          status: true,
          subtitle: true,
          title: true,
          totalAmount: true,
        },
        where: { id: { in: selectedTransportIds } },
      }),
      transaction.booking.findMany({
        select: {
          confirmationCode: true,
          currency: true,
          hotelSlug: true,
          id: true,
          quote: { select: { checkInDate: true, checkOutDate: true } },
          status: true,
          totalAmount: true,
        },
        where: { id: { in: selectedHotelIds } },
      }),
    ]);

    const transportById = new Map(transportRows.map((row) => [row.id, row]));
    const transportEntries = selectedTransportIds.flatMap((id): CustomerTravelHistoryEntry[] => {
      const trip = transportById.get(id);
      if (!trip) return [];
      const reference = customerTravelHistoryTransportReference(
        trip.confirmationCode,
        trip.productType,
      );
      if (!reference) return [];
      const money = customerTravelHistoryMoney(trip.totalAmount, trip.currency);
      return [
        {
          bookingReference: reference.bookingReference,
          currency: money?.currency ?? null,
          detailHref: `/account/trips/${encodeURIComponent(reference.bookingReference)}`,
          document: customerTravelHistoryTransportDocument(
            reference.product,
            reference.bookingReference,
            trip.detailsJson,
          ),
          endDate: customerTravelHistoryDate(trip.endDate),
          product: reference.product,
          startDate: customerTravelHistoryDate(trip.startDate),
          status: customerTravelHistoryStatus(trip.status),
          subtitle: customerTravelHistoryText(
            trip.subtitle,
            'Travel service details are under review.',
            200,
          ),
          title: customerTravelHistoryText(
            trip.title,
            `${reference.product.toLowerCase()} booking`,
            160,
          ),
          totalAmount: money?.amount ?? null,
        },
      ];
    });

    const hotelById = new Map(hotelRows.map((row) => [row.id, row]));
    const hotelEntries = selectedHotelIds.flatMap((id): CustomerTravelHistoryEntry[] => {
      const booking = hotelById.get(id);
      if (!booking) return [];
      const bookingReference = customerTravelHistoryHotelReference(booking.confirmationCode);
      if (!bookingReference) return [];
      const money = customerTravelHistoryMoney(booking.totalAmount, booking.currency);
      return [
        {
          bookingReference,
          currency: money?.currency ?? null,
          detailHref: `/account/hotel-bookings/${encodeURIComponent(bookingReference)}`,
          document: {
            href: `/manage-booking/${encodeURIComponent(bookingReference)}/voucher`,
            label: 'View voucher',
          },
          endDate: customerTravelHistoryDate(booking.quote.checkOutDate),
          product: 'HOTEL',
          startDate: customerTravelHistoryDate(booking.quote.checkInDate),
          status: customerTravelHistoryStatus(booking.status),
          subtitle: 'Hotel stay',
          title: customerTravelHistoryHotelName(booking.hotelSlug),
          totalAmount: money?.amount ?? null,
        },
      ];
    });

    return {
      hotels: {
        count: hotelIds.length,
        entries: hotelEntries,
        isCapped: ownedHotels.length > CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
        page: hotelPaging.page,
        pages: hotelPaging.pages,
      },
      transport: {
        count: transportIds.length,
        entries: transportEntries,
        isCapped: ownedTransport.length > CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
        page: transportPaging.page,
        pages: transportPaging.pages,
      },
    } satisfies CustomerTravelHistoryDirectory;
  });
}
