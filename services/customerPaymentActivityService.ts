import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import type {
  CustomerPaymentActivity,
  CustomerPaymentActivityPage,
} from '@/types/customerPaymentActivity';
import {
  CUSTOMER_PAYMENT_MAX_RESULTS,
  CUSTOMER_PAYMENT_PAGE_SIZE,
  CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT,
  customerHotelBookingStatus,
  customerPaymentStatus,
  customerRefundStatus,
  normalizeCustomerPaymentPage,
} from './customerPaymentActivityRules.ts';

type OwnedBookingId = { bookingId: string };

export class CustomerPaymentHistoryLimitError extends Error {
  constructor() {
    super('Your payment history is larger than this online view can safely display.');
    this.name = 'CustomerPaymentHistoryLimitError';
  }
}

function hotelName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function getCustomerPaymentActivity(
  sessionEmail: string,
  requestedPage: number,
): Promise<CustomerPaymentActivityPage> {
  const email = normalizeEmail(sessionEmail);
  const ownedBookingIds = await prisma.$queryRaw<OwnedBookingId[]>`
    SELECT guest."bookingId" AS "bookingId"
    FROM "BookingGuest" AS guest
    INNER JOIN "Booking" AS booking ON booking."id" = guest."bookingId"
    WHERE LOWER(TRIM(guest."email")) = ${email}
    ORDER BY booking."createdAt" DESC, guest."bookingId" DESC
    LIMIT ${CUSTOMER_PAYMENT_MAX_RESULTS + 1}
  `;

  if (ownedBookingIds.length > CUSTOMER_PAYMENT_MAX_RESULTS) {
    throw new CustomerPaymentHistoryLimitError();
  }

  const bookingIds = ownedBookingIds.map((booking) => booking.bookingId);
  if (bookingIds.length === 0) {
    return {
      activities: [],
      page: 1,
      pageCount: 1,
      pageSize: CUSTOMER_PAYMENT_PAGE_SIZE,
      totalCount: 0,
    };
  }

  const totalCount = await prisma.paymentTransaction.count({
    where: { bookingId: { in: bookingIds } },
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / CUSTOMER_PAYMENT_PAGE_SIZE));
  const page = Math.min(normalizeCustomerPaymentPage(String(requestedPage)), pageCount);
  const payments = await prisma.paymentTransaction.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      _count: { select: { refunds: true } },
      amount: true,
      booking: {
        select: {
          confirmationCode: true,
          hotelSlug: true,
          quote: { select: { checkInDate: true, checkOutDate: true } },
          status: true,
        },
      },
      createdAt: true,
      currency: true,
      refunds: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          amount: true,
          createdAt: true,
          currency: true,
          reviewedAt: true,
          status: true,
        },
        take: CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT,
      },
      status: true,
      updatedAt: true,
    },
    skip: (page - 1) * CUSTOMER_PAYMENT_PAGE_SIZE,
    take: CUSTOMER_PAYMENT_PAGE_SIZE,
    where: { bookingId: { in: bookingIds } },
  });

  const activities: CustomerPaymentActivity[] = payments.map((payment) => ({
    bookingReference: payment.booking.confirmationCode,
    bookingStatus: customerHotelBookingStatus(payment.booking.status),
    createdAt: payment.createdAt.toISOString(),
    currency: payment.currency,
    hotelName: hotelName(payment.booking.hotelSlug),
    paymentAmount: payment.amount,
    paymentStatus: customerPaymentStatus(payment.status),
    refundCount: payment._count.refunds,
    refunds: payment.refunds.map((refund) => ({
      amount: refund.amount,
      createdAt: refund.createdAt.toISOString(),
      currency: refund.currency,
      resolvedAt: refund.reviewedAt?.toISOString() ?? null,
      status: customerRefundStatus(refund.status),
    })),
    stay: payment.booking.quote,
    updatedAt: payment.updatedAt.toISOString(),
  }));

  return {
    activities,
    page,
    pageCount,
    pageSize: CUSTOMER_PAYMENT_PAGE_SIZE,
    totalCount,
  };
}
