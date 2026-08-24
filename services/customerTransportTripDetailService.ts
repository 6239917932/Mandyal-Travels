import { normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';
import {
  customerTransportBookingStatus,
  customerTransportDate,
  customerTransportMoney,
  customerTransportText,
  normalizeCustomerTransportReference,
  readCustomerTransportFacts,
} from '@/services/customerTransportTripDetailRules';
import type {
  CustomerTransportServicingEvent,
  CustomerTransportTripDetail,
} from '@/types/customerTransportTripDetail';

export const CUSTOMER_TRANSPORT_SUPPORT_LIMIT = 25;
export const CUSTOMER_TRANSPORT_EVENT_LIMIT = 51;

type OwnedTripId = Readonly<{ id: string }>;

export class CustomerTransportHistoryLimitError extends Error {
  constructor() {
    super('This booking has more servicing history than the online detail can safely display.');
    this.name = 'CustomerTransportHistoryLimitError';
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

export async function getCustomerTransportTripDetail(input: {
  confirmationCode: string;
  sessionEmail: string;
  userId: string;
}): Promise<CustomerTransportTripDetail | undefined> {
  const reference = normalizeCustomerTransportReference(input.confirmationCode);
  if (!reference) return undefined;

  const email = normalizeEmail(input.sessionEmail);
  return prisma.$transaction(async (transaction) => {
    const ownedTrips = await transaction.$queryRaw<OwnedTripId[]>`
      SELECT trip."id" AS "id"
      FROM "CustomerTrip" AS trip
      WHERE trip."confirmationCode" = ${reference.confirmationCode}
        AND trip."productType" = ${reference.product}
        AND (
          trip."userId" = ${input.userId}
          OR (
            trip."userId" IS NULL
            AND LOWER(TRIM(trip."email")) = ${email}
          )
        )
      LIMIT 2
    `;
    if (ownedTrips.length !== 1) return undefined;

    const trip = await transaction.customerTrip.findUnique({
      select: {
        confirmationCode: true,
        createdAt: true,
        currency: true,
        detailsJson: true,
        endDate: true,
        productType: true,
        startDate: true,
        status: true,
        subtitle: true,
        title: true,
        totalAmount: true,
      },
      where: { id: ownedTrips[0].id },
    });
    if (!trip || trip.productType !== reference.product) return undefined;

    const supportCases = await transaction.customerSupportCase.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        caseNumber: true,
        category: true,
        closedAt: true,
        createdAt: true,
        status: true,
      },
      take: CUSTOMER_TRANSPORT_SUPPORT_LIMIT + 1,
      where: {
        OR: [{ customerTripId: ownedTrips[0].id }, { bookingReference: trip.confirmationCode }],
        userId: input.userId,
      },
    });
    if (supportCases.length > CUSTOMER_TRANSPORT_SUPPORT_LIMIT) {
      throw new CustomerTransportHistoryLimitError();
    }

    const servicingHistory: CustomerTransportServicingEvent[] = [
      {
        at: trip.createdAt.toISOString(),
        description: `${reference.product.toLowerCase()} booking record created.`,
        key: 'booking-recorded',
        kind: 'BOOKING',
        status: 'RECORDED',
        title: 'Booking recorded',
      },
    ];
    supportCases.forEach((supportCase, index) => {
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
    if (servicingHistory.length > CUSTOMER_TRANSPORT_EVENT_LIMIT) {
      throw new CustomerTransportHistoryLimitError();
    }

    servicingHistory.sort((left, right) =>
      left.at === right.at ? left.key.localeCompare(right.key) : left.at.localeCompare(right.at),
    );
    const money = customerTransportMoney(trip.totalAmount, trip.currency);

    return {
      bookedAt: trip.createdAt.toISOString(),
      bookingReference: trip.confirmationCode,
      bookingStatus: customerTransportBookingStatus(trip.status),
      currency: money?.currency ?? null,
      endDate: customerTransportDate(trip.endDate),
      facts: readCustomerTransportFacts(reference.product, trip.detailsJson),
      fulfillment: {
        message:
          'Live supplier fulfilment is not connected. This portal record is not a provider-issued ticket, voucher, or operational confirmation.',
        status: 'PROVIDER_CONNECTION_PENDING',
      },
      product: reference.product,
      servicingHistory,
      startDate: customerTransportDate(trip.startDate),
      subtitle: customerTransportText(
        trip.subtitle,
        'Travel service details are under review.',
        200,
      ),
      title: customerTransportText(trip.title, `${reference.product.toLowerCase()} booking`, 160),
      totalAmount: money?.amount ?? null,
    } satisfies CustomerTransportTripDetail;
  });
}
