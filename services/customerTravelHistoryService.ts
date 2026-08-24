import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
  CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE,
  customerTravelHistoryDate,
  customerTravelHistoryDocument,
  customerTravelHistoryHotelName,
  customerTravelHistoryHotelReference,
  customerTravelHistoryMoney,
  customerTravelHistoryPagination,
  customerTravelHistoryStatus,
  customerTravelHistoryText,
  customerTravelHistoryTransportReference,
} from '@/services/customerTravelHistoryRules';
import type {
  CustomerTravelHistoryDirectory,
  CustomerTravelHistoryEntry,
  CustomerTravelHistoryPage,
} from '@/types/customerTravelHistory';

type OwnedId = Readonly<{ id: string }>;

type DashboardTransportSummaryRow = Readonly<{
  bookedValue: bigint | number | null;
  confirmedCount: bigint | number;
  count: bigint | number;
}>;

export type CustomerTravelHistoryDashboardTransport = Readonly<{
  bookedValue: number;
  confirmedCount: number;
  count: number;
  entries: readonly Readonly<{
    confirmationCode: string;
    createdAt: Date;
    currency: string;
    detailsJson: string | null;
    endDate: string | null;
    id: string;
    productType: string;
    startDate: string;
    status: string;
    subtitle: string;
    title: string;
    totalAmount: number;
  }>[];
}>;

function safeDashboardAggregate(value: bigint | number | null): number {
  const converted = typeof value === 'bigint' ? Number(value) : (value ?? 0);
  return Number.isSafeInteger(converted) && converted >= 0 ? converted : 0;
}

function emptyPage(): CustomerTravelHistoryPage {
  return { count: 0, entries: [], isCapped: false, page: 1, pages: 1 };
}

export async function getCustomerTravelHistoryDashboardTransport(input: {
  sessionEmail: string;
  userId: string;
}): Promise<CustomerTravelHistoryDashboardTransport> {
  const userId = input.userId.trim();
  const sessionEmail = normalizeEmail(input.sessionEmail);
  if (!userId || !sessionEmail) {
    return { bookedValue: 0, confirmedCount: 0, count: 0, entries: [] };
  }

  return prisma.$transaction(async (transaction) => {
    const [ownedTransport, summaryRows] = await Promise.all([
      transaction.$queryRaw<OwnedId[]>`
        SELECT trip."id" AS "id"
        FROM "CustomerTrip" AS trip
        WHERE trip."userId" = ${userId}
          OR (
            trip."userId" IS NULL
            AND LOWER(TRIM(trip."email")) = ${sessionEmail}
          )
        ORDER BY trip."createdAt" DESC, trip."id" DESC
        LIMIT 20
      `,
      transaction.$queryRaw<DashboardTransportSummaryRow[]>`
        SELECT
          COUNT(*) AS "count",
          SUM(CASE WHEN trip."status" = 'CONFIRMED' THEN 1 ELSE 0 END) AS "confirmedCount",
          SUM(CASE WHEN trip."currency" = 'INR' THEN trip."totalAmount" ELSE 0 END) AS "bookedValue"
        FROM "CustomerTrip" AS trip
        WHERE trip."userId" = ${userId}
          OR (
            trip."userId" IS NULL
            AND LOWER(TRIM(trip."email")) = ${sessionEmail}
          )
      `,
    ]);
    const ids = ownedTransport.map(({ id }) => id);
    const rows = await transaction.customerTrip.findMany({
      select: {
        confirmationCode: true,
        createdAt: true,
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
      where: { id: { in: ids } },
    });
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const summary = summaryRows[0];

    return {
      bookedValue: safeDashboardAggregate(summary?.bookedValue ?? null),
      confirmedCount: safeDashboardAggregate(summary?.confirmedCount ?? 0),
      count: safeDashboardAggregate(summary?.count ?? 0),
      entries: ids.flatMap((id) => {
        const row = rowsById.get(id);
        return row ? [row] : [];
      }),
    };
  });
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
          document: customerTravelHistoryDocument(
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
          document: customerTravelHistoryDocument('HOTEL', bookingReference, null),
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
