import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import type {
  CustomerHotelBookingDetail,
  CustomerHotelBookingStatus,
  CustomerHotelServicingEvent,
  CustomerHotelStayStatus,
} from '@/types/customerHotelBookingDetail';

export const CUSTOMER_HOTEL_AMENDMENT_LIMIT = 25;
export const CUSTOMER_HOTEL_SUPPORT_CASE_LIMIT = 25;
export const CUSTOMER_HOTEL_SERVICING_EVENT_LIMIT = 101;

const HOTEL_REFERENCE_PATTERN = /^MT[A-F0-9]{12}$/;

type OwnedBookingId = { id: string };

export class CustomerHotelServicingHistoryLimitError extends Error {
  constructor() {
    super('This booking has more servicing history than the online detail can safely display.');
    this.name = 'CustomerHotelServicingHistoryLimitError';
  }
}

export function normalizeHotelBookingReference(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  return HOTEL_REFERENCE_PATTERN.test(normalized) ? normalized : undefined;
}

export function customerHotelBookingStatus(value: string): CustomerHotelBookingStatus {
  switch (value.trim().toLowerCase()) {
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'pending':
    case 'processing':
      return 'PROCESSING';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerHotelStayStatus(
  bookingStatus: CustomerHotelBookingStatus,
  value: string,
): CustomerHotelStayStatus {
  if (bookingStatus === 'CANCELLED') return 'CANCELLED';
  switch (value.trim().toUpperCase()) {
    case 'RESERVED':
      return 'UPCOMING';
    case 'CHECKED_IN':
      return 'CHECKED_IN';
    case 'CHECKED_OUT':
      return 'COMPLETED';
    case 'NO_SHOW':
      return 'DID_NOT_CHECK_IN';
    default:
      return 'UNDER_REVIEW';
  }
}

function amendmentStatus(value: string): 'APPROVED' | 'NOT_APPROVED' | 'UNDER_REVIEW' {
  switch (value.trim().toLowerCase()) {
    case 'approved':
      return 'APPROVED';
    case 'declined':
    case 'rejected':
      return 'NOT_APPROVED';
    default:
      return 'UNDER_REVIEW';
  }
}

function supportStatus(value: string): 'CLOSED' | 'OPEN' | 'UNDER_REVIEW' {
  switch (value.trim().toUpperCase()) {
    case 'CLOSED':
      return 'CLOSED';
    case 'OPEN':
      return 'OPEN';
    default:
      return 'UNDER_REVIEW';
  }
}

function supportCategory(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    ACCOUNT: 'Account support',
    BOOKING: 'Booking support',
    OTHER: 'General support',
    PAYMENT: 'Payment support',
    TECHNICAL: 'Technical support',
  };
  return labels[value.trim().toUpperCase()] ?? 'General support';
}

function hotelName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function getCustomerHotelBookingDetail(input: {
  confirmationCode: string;
  sessionEmail: string;
  userId: string;
}): Promise<CustomerHotelBookingDetail | undefined> {
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  if (!confirmationCode) return undefined;

  const email = normalizeEmail(input.sessionEmail);
  const ownedBookings = await prisma.$queryRaw<OwnedBookingId[]>`
    SELECT booking."id" AS "id"
    FROM "Booking" AS booking
    INNER JOIN "BookingGuest" AS guest ON guest."bookingId" = booking."id"
    WHERE booking."confirmationCode" = ${confirmationCode}
      AND LOWER(TRIM(guest."email")) = ${email}
    LIMIT 2
  `;
  if (ownedBookings.length !== 1) return undefined;

  const booking = await prisma.booking.findUnique({
    select: {
      amendments: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          createdAt: true,
          requestedCheckInDate: true,
          requestedCheckOutDate: true,
          reviewedAt: true,
          status: true,
        },
        take: CUSTOMER_HOTEL_AMENDMENT_LIMIT + 1,
      },
      confirmationCode: true,
      createdAt: true,
      currency: true,
      hotelSlug: true,
      operationalStatus: true,
      quote: { select: { checkInDate: true, checkOutDate: true, rooms: true } },
      status: true,
      totalAmount: true,
    },
    where: { id: ownedBookings[0].id },
  });
  if (!booking) return undefined;
  if (booking.amendments.length > CUSTOMER_HOTEL_AMENDMENT_LIMIT) {
    throw new CustomerHotelServicingHistoryLimitError();
  }
  const customerSupportCases = await prisma.customerSupportCase.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      caseNumber: true,
      category: true,
      closedAt: true,
      createdAt: true,
      status: true,
    },
    take: CUSTOMER_HOTEL_SUPPORT_CASE_LIMIT + 1,
    where: {
      OR: [{ hotelBookingId: ownedBookings[0].id }, { bookingReference: booking.confirmationCode }],
      userId: input.userId,
    },
  });
  if (customerSupportCases.length > CUSTOMER_HOTEL_SUPPORT_CASE_LIMIT) {
    throw new CustomerHotelServicingHistoryLimitError();
  }

  const servicingHistory: CustomerHotelServicingEvent[] = [
    {
      at: booking.createdAt.toISOString(),
      description: `Stay booked for ${booking.quote.checkInDate} to ${booking.quote.checkOutDate}.`,
      key: 'booking-created',
      kind: 'BOOKING',
      status: 'CONFIRMED',
      title: 'Hotel booking recorded',
    },
  ];
  booking.amendments.forEach((amendment, index) => {
    servicingHistory.push({
      at: amendment.createdAt.toISOString(),
      description: `Requested stay ${amendment.requestedCheckInDate} to ${amendment.requestedCheckOutDate}.`,
      key: `date-change-${index + 1}-requested`,
      kind: 'DATE_CHANGE',
      status: 'REQUEST_RECEIVED',
      title: 'Date-change request received',
    });
    if (amendment.reviewedAt) {
      const status = amendmentStatus(amendment.status);
      servicingHistory.push({
        at: amendment.reviewedAt.toISOString(),
        description: `Requested stay ${amendment.requestedCheckInDate} to ${amendment.requestedCheckOutDate}.`,
        key: `date-change-${index + 1}-reviewed`,
        kind: 'DATE_CHANGE',
        status,
        title:
          status === 'APPROVED'
            ? 'Date change approved'
            : status === 'NOT_APPROVED'
              ? 'Date change not approved'
              : 'Date change reviewed',
      });
    }
  });
  customerSupportCases.forEach((supportCase, index) => {
    servicingHistory.push({
      at: supportCase.createdAt.toISOString(),
      description: `${supportCase.caseNumber} · ${supportCategory(supportCase.category)}`,
      key: `support-${index + 1}-opened`,
      kind: 'SUPPORT',
      status: 'OPEN',
      title: 'Support case opened',
    });
    if (supportCase.closedAt) {
      const status = supportStatus(supportCase.status);
      servicingHistory.push({
        at: supportCase.closedAt.toISOString(),
        description: supportCase.caseNumber,
        key: `support-${index + 1}-closed`,
        kind: 'SUPPORT',
        status,
        title: status === 'CLOSED' ? 'Support case closed' : 'Support case updated',
      });
    }
  });
  if (servicingHistory.length > CUSTOMER_HOTEL_SERVICING_EVENT_LIMIT) {
    throw new CustomerHotelServicingHistoryLimitError();
  }
  servicingHistory.sort((left, right) =>
    left.at === right.at ? left.key.localeCompare(right.key) : left.at.localeCompare(right.at),
  );

  const bookingStatus = customerHotelBookingStatus(booking.status);
  return {
    bookedAt: booking.createdAt.toISOString(),
    bookingReference: booking.confirmationCode,
    bookingStatus,
    currency: booking.currency,
    hotelName: hotelName(booking.hotelSlug),
    rooms: booking.quote.rooms,
    servicingHistory,
    stay: {
      checkInDate: booking.quote.checkInDate,
      checkOutDate: booking.quote.checkOutDate,
      status: customerHotelStayStatus(bookingStatus, booking.operationalStatus),
    },
    totalAmount: booking.totalAmount,
  };
}
