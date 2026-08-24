import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_DOCUMENT_PAGE_SIZE,
  cappedCustomerDocumentCount,
  customerDocumentPageCount,
  isCustomerDocumentProduct,
  safeTransportDocumentLink,
  type CustomerDocumentLink,
  type CustomerDocumentProduct,
} from '@/lib/customerDocuments';
import {
  hotelDocumentPosture,
  tripDocumentPosture,
  type DocumentReadiness,
} from '@/services/adminDocumentWorkbenchService';

export type CustomerDocumentRecord = Readonly<{
  createdAt: string;
  documentLinks: readonly CustomerDocumentLink[];
  id: string;
  productType: 'HOTEL' | 'TRANSPORT' | CustomerDocumentProduct;
  reference: string;
  readiness: DocumentReadiness;
  readinessMessage: string;
  status: string;
  subtitle: string;
  title: string;
}>;

export type CustomerDocumentCollection = Readonly<{
  capped: boolean;
  page: number;
  pageCount: number;
  records: readonly CustomerDocumentRecord[];
  total: number;
}>;

export type CustomerDocumentIndex = Readonly<{
  hotels: CustomerDocumentCollection;
  transport: CustomerDocumentCollection;
}>;

function humanizeSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function boundedPage(requestedPage: number, count: number): number {
  return Math.min(Math.max(1, requestedPage), customerDocumentPageCount(count));
}

export async function listCustomerDocuments(input: {
  email: string;
  hotelPage: number;
  tripPage: number;
  userId: string;
}): Promise<CustomerDocumentIndex> {
  const tripWhere = { userId: input.userId } as const;
  const hotelWhere = { email: input.email } as const;
  const [rawTripCount, rawHotelCount] = await Promise.all([
    prisma.customerTrip.count({ where: tripWhere }),
    prisma.bookingGuest.count({ where: hotelWhere }),
  ]);
  const tripCount = cappedCustomerDocumentCount(rawTripCount);
  const hotelCount = cappedCustomerDocumentCount(rawHotelCount);
  const tripPage = boundedPage(input.tripPage, tripCount);
  const hotelPage = boundedPage(input.hotelPage, hotelCount);

  const [trips, hotelGuests] = await Promise.all([
    prisma.customerTrip.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        confirmationCode: true,
        createdAt: true,
        detailsJson: true,
        id: true,
        productType: true,
        status: true,
        subtitle: true,
        title: true,
      },
      skip: (tripPage - 1) * CUSTOMER_DOCUMENT_PAGE_SIZE,
      take: CUSTOMER_DOCUMENT_PAGE_SIZE,
      where: tripWhere,
    }),
    prisma.bookingGuest.findMany({
      orderBy: [{ booking: { createdAt: 'desc' } }, { id: 'desc' }],
      select: {
        booking: {
          select: {
            amendments: { select: { status: true } },
            confirmationCode: true,
            createdAt: true,
            currency: true,
            hotelSlug: true,
            id: true,
            payment: { select: { amount: true, currency: true, status: true } },
            refunds: { select: { status: true } },
            status: true,
            totalAmount: true,
          },
        },
      },
      skip: (hotelPage - 1) * CUSTOMER_DOCUMENT_PAGE_SIZE,
      take: CUSTOMER_DOCUMENT_PAGE_SIZE,
      where: hotelWhere,
    }),
  ]);

  return {
    hotels: {
      capped: rawHotelCount > hotelCount,
      page: hotelPage,
      pageCount: customerDocumentPageCount(hotelCount),
      records: hotelGuests.map(({ booking }) => {
        const posture = hotelDocumentPosture({
          amendmentStatuses: booking.amendments.map((item) => item.status),
          bookingCurrency: booking.currency,
          bookingStatus: booking.status,
          bookingTotal: booking.totalAmount,
          paymentAmount: booking.payment?.amount ?? null,
          paymentCurrency: booking.payment?.currency ?? null,
          paymentStatus: booking.payment?.status ?? null,
          refundStatuses: booking.refunds.map((item) => item.status),
        });
        const documentLinks: CustomerDocumentLink[] = [];
        if (posture.confirmation === 'READY') {
          documentLinks.push({
            href: `/manage-booking/${booking.confirmationCode}/voucher`,
            label: 'Open hotel booking voucher',
          });
        }
        if (posture.billing === 'READY') {
          documentLinks.push({
            href: `/manage-booking/${booking.confirmationCode}/invoice`,
            label: 'Open provisional payment receipt',
          });
        }
        return {
          createdAt: booking.createdAt.toISOString(),
          documentLinks,
          id: booking.id,
          productType: 'HOTEL' as const,
          readiness: posture.confirmation,
          readinessMessage:
            posture.billing === 'READY'
              ? 'Voucher and provisional payment receipt are available. The receipt is not a statutory tax invoice.'
              : posture.reason,
          reference: booking.confirmationCode,
          status: booking.status,
          subtitle: 'Hotel stay',
          title: humanizeSlug(booking.hotelSlug),
        };
      }),
      total: hotelCount,
    },
    transport: {
      capped: rawTripCount > tripCount,
      page: tripPage,
      pageCount: customerDocumentPageCount(tripCount),
      records: trips.map((trip) => {
        const posture = tripDocumentPosture(trip.status);
        const documentLink = safeTransportDocumentLink(trip);
        return {
          createdAt: trip.createdAt.toISOString(),
          documentLinks: documentLink ? [documentLink] : [],
          id: trip.id,
          productType: isCustomerDocumentProduct(trip.productType) ? trip.productType : 'TRANSPORT',
          readiness: documentLink ? posture.confirmation : 'BLOCKED',
          readinessMessage: documentLink
            ? 'Prototype travel document available. Provider fulfillment and final provider documents remain pending.'
            : posture.confirmation === 'READY'
              ? 'The saved document link is unavailable. Contact support with the booking reference.'
              : posture.reason,
          reference: trip.confirmationCode,
          status: trip.status,
          subtitle: trip.subtitle,
          title: trip.title,
        };
      }),
      total: tripCount,
    },
  };
}
