import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

function csvCell(value: string | number | null) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return Response.json({ error: 'Business administrator access is required.' }, { status: 403 });
  }

  const requests = await prisma.businessTravelRequest.findMany({
    include: {
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      requester: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { bookedAt: 'desc' },
    where: { organizationId: access.membership.organizationId, status: 'BOOKED' },
  });

  const header = [
    'Booking reference',
    'Product',
    'Traveller',
    'Traveller email',
    'Purpose or destination',
    'Start date',
    'End date',
    'Booked amount',
    'Currency',
    'Booked at',
  ];
  const rows = requests.map((request) => [
    request.customerTrip?.confirmationCode ?? request.hotelBooking?.confirmationCode ?? '',
    request.productType,
    `${request.requester.firstName} ${request.requester.lastName}`,
    request.requester.email,
    request.title,
    request.startDate,
    request.endDate,
    request.bookingTotalAmount,
    request.currency,
    request.bookedAt?.toISOString() ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

  return new R◊~∫ˆ⁄$z{-ÆÈ‹j◊ùnc findByIdempotencyKey(key: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true },
      where: { idempotencyKey: key },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findById(id: string): Promise<HotelBookingRecord | undefined> {
    const booking = await prisma.booking.findUnique({
      include: { guest: true, payment: true },
      where: { id },
    });
    return booking ? mapBooking(booking) : undefined;
  }

  async findAll(): Promise<HotelBookingRecord[]> {
    const bookings = await prisma.booking.findMany({
      include: { guest: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    return bookings
      .map(mapBooking)
      .filter((booking): booking is HotelBookingRecord => booking !== undefined);
  }

  async save(
    booking: HotelBookingRecord,
    idempotencyKey: string,
    accessTokenHash: string,
    businessContext?: BusinessBookingContext,
  ): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      let organizationId: string | undefined;
      if (businessContext) {
        const travelRequest = await transaction.businessTravelRequest.findFirst({
          select: { organizationId: true },
          where: {
            id: businessContext.requestId,
            requesterId: businessContext.requesterId,
            status: 'APPROVED',
          },
        });
        organizationId = travelRequest?.organizationId;
        const completed = await transaction.businessTravelRequest.updateMany({
          data: {
            bookedAt: new Date(),
            bookingTotalAmount: booking.totalAmount,
            status: 'BOOKED',
          },
          where: {
            id: businessContext.requestId,
            requesterId: businessContext.requesterId,
            status: 'APPROVED',
          },
        });
        if (completed.count !== 1) {
          throw new BusinessBookingRequestUnavailableError();
        }
      }

      await transaction.booking.create({
        data: {
          accessTokenHash,
          availabilityLockId: booking.availabilityLockId,
          businessTravelRequestId: businessContext?.requestId,
          confirmationCode: booking.confirmationCode,
          createdAt: new Date(booking.createdAt),
          currency: booking.currency,
          guest: { create: booking.guest },
          hotelSlug: booking.hotelSlug,
          id: booking.id,
          idempotencyKey,
          payment: {
            create: {
              amount: booking.totalAmount,
              currency: booking.currency,
              provider: 'mock',
              providerRef: `mock-${booking.id}`,
              status: booking.paymentStatus,
            },
          },
          quoteId: booking.quoteId,
          status: booking.status,
          totalAmount: booking.totalAmount,
        },
      });

      if (businessContext && organizationId) {
        await transaction.businessAuditLog.create({
          data: createBusinessAuditData({
            action: BUSINESS_AUDIT_ACTIONS.TRAVEL_BOOKED,
            actorUserId: businessContext.requesterId,
            entityId: businessContext.requestId,
            entityType: 'TRAVEL_REQUEST',
            metadata: {
              confirmationCode: booking.confirmationCode,
              productType: 'HOTEL',
              totalAmount: booking.totalAmount,
            },
            organizationId,
            summary: 'Hotel company travel booked.',
          }),
        });
      }
    });
  }
}

export const bookingRepository = new PrismaBookingRepository();
