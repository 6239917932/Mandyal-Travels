import type { Prisma } from '@/generated/prisma/client';
import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT,
  CUSTOMER_SUPPORT_PAGE_SIZE,
  customerServicingSubject,
  customerSupportCategoryLabel,
  customerSupportPublicStatusLabel,
  isTransportServicingIntentAllowed,
} from '@/services/customerServicingIntentRules';
import type {
  CustomerServicingIntent,
  CustomerSupportCategory,
  CustomerSupportCenterResult,
} from '@/types/customerSupportCenter';

export class CustomerSupportRequestError extends Error {
  constructor(
    readonly code: 'BOOKING_NOT_OWNED' | 'INVALID_SERVICING_INTENT',
    message: string,
  ) {
    super(message);
    this.name = 'CustomerSupportRequestError';
  }
}

function createCaseNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `MTCC-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

type CreateCustomerSupportCaseInput = {
  bookingReference: string;
  category: CustomerSupportCategory;
  email: string;
  intent: CustomerServicingIntent;
  message: string;
  subject: string;
  userId: string;
};

async function resolveOwnedBooking(
  transaction: Prisma.TransactionClient,
  input: Pick<CreateCustomerSupportCaseInput, 'bookingReference' | 'email' | 'userId'>,
) {
  if (!input.bookingReference) {
    return { customerTripId: undefined, hotelBookingId: undefined, productType: null };
  }

  const normalizedEmail = normalizeEmail(input.email);
  const [trip, hotelBooking] = await Promise.all([
    transaction.customerTrip.findUnique({
      select: { email: true, id: true, productType: true, userId: true },
      where: { confirmationCode: input.bookingReference },
    }),
    transaction.booking.findUnique({
      select: { guest: { select: { email: true } }, id: true },
      where: { confirmationCode: input.bookingReference },
    }),
  ]);

  const ownsTrip =
    trip?.userId === input.userId ||
    (trip?.userId === null && normalizeEmail(trip.email) === normalizedEmail);
  const ownsHotel = Boolean(
    hotelBooking?.guest && normalizeEmail(hotelBooking.guest.email) === normalizedEmail,
  );

  if (Number(Boolean(ownsTrip)) + Number(Boolean(ownsHotel)) !== 1) {
    throw new CustomerSupportRequestError(
      'BOOKING_NOT_OWNED',
      'That booking reference is not connected to this account.',
    );
  }

  if (trip && ownsTrip) {
    if (trip.userId === null) {
      const claimed = await transaction.customerTrip.updateMany({
        data: { userId: input.userId },
        where: { id: trip.id, userId: null },
      });
      if (claimed.count !== 1) {
        throw new CustomerSupportRequestError(
          'BOOKING_NOT_OWNED',
          'That booking reference is not connected to this account.',
        );
      }
    }
    return { customerTripId: trip.id, hotelBookingId: undefined, productType: trip.productType };
  }

  return { customerTripId: undefined, hotelBookingId: hotelBooking?.id, productType: null };
}

export async function createCustomerSupportCase(input: CreateCustomerSupportCaseInput) {
  return prisma.$transaction(async (transaction) => {
    const booking = await resolveOwnedBooking(transaction, input);
    if (
      !isTransportServicingIntentAllowed({
        category: input.category,
        hasBookingReference: Boolean(input.bookingReference),
        intent: input.intent,
        productType: booking.productType,
      })
    ) {
      throw new CustomerSupportRequestError(
        'INVALID_SERVICING_INTENT',
        'Change and cancellation requests are available only for an owned Flight, Bus, or Car trip.',
      );
    }

    const created = await transaction.customerSupportCase.create({
      data: {
        bookingReference: input.bookingReference || null,
        caseNumber: createCaseNumber(),
        category: input.category,
        customerTripId: booking.customerTripId,
        hotelBookingId: booking.hotelBookingId,
        message: input.message,
        status: 'OPEN',
        subject: customerServicingSubject({
          intent: input.intent,
          productType: booking.productType,
          subject: input.subject,
        }),
        userId: input.userId,
      },
      select: { caseNumber: true, createdAt: true, id: true, status: true },
    });
    await transaction.customerSupportCaseEvent.create({
      data: {
        action: 'CREATED',
        actorUserId: input.userId,
        caseId: created.id,
        summary: `Customer support case ${created.caseNumber} created.`,
      },
    });
    return created;
  });
}

export async function getCustomerSupportCenter({
  page: requestedPage,
  query,
  status,
  userId,
}: {
  page: number;
  query: string;
  status: 'ALL' | 'CLOSED' | 'OPEN';
  userId: string;
}): Promise<CustomerSupportCenterResult> {
  const where: Prisma.CustomerSupportCaseWhereInput = {
    userId,
    status: status === 'ALL' ? { in: ['CLOSED', 'OPEN'] } : status,
    ...(query
      ? {
          OR: [
            { bookingReference: { contains: query } },
            { caseNumber: { contains: query } },
            { subject: { contains: query } },
          ],
        }
      : {}),
  };
  const [matchingCount, openCount, closedCount] = await Promise.all([
    prisma.customerSupportCase.count({ where }),
    prisma.customerSupportCase.count({ where: { status: 'OPEN', userId } }),
    prisma.customerSupportCase.count({ where: { status: 'CLOSED', userId } }),
  ]);
  const totalCases = Math.min(matchingCount, CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT);
  const totalPages = Math.max(1, Math.ceil(totalCases / CUSTOMER_SUPPORT_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const cases = await prisma.customerSupportCase.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: {
      bookingReference: true,
      caseNumber: true,
      category: true,
      createdAt: true,
      id: true,
      message: true,
      resolutionNote: true,
      status: true,
      subject: true,
      updatedAt: true,
    },
    skip: (page - 1) * CUSTOMER_SUPPORT_PAGE_SIZE,
    take: CUSTOMER_SUPPORT_PAGE_SIZE,
    where,
  });

  return {
    cases: cases.map((supportCase) => ({
      bookingReference: supportCase.bookingReference,
      caseNumber: supportCase.caseNumber,
      categoryLabel: customerSupportCategoryLabel(supportCase.category),
      createdAt: supportCase.createdAt,
      id: supportCase.id,
      message: supportCase.message,
      resolutionNote: supportCase.resolutionNote,
      statusLabel: customerSupportPublicStatusLabel(supportCase.status),
      subject: supportCase.subject,
      updatedAt: supportCase.updatedAt,
    })),
    closedCases: Math.min(closedCount, CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT),
    openCases: Math.min(openCount, CUSTOMER_SUPPORT_ABSOLUTE_RECORD_LIMIT),
    page,
    query,
    status,
    totalCases,
    totalPages,
  };
}
