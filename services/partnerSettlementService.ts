import { prisma } from '@/lib/prisma';

export class PartnerSettlementError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function dateBoundary(value: string, end: boolean): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new PartnerSettlementError('INVALID_PERIOD', 'Settlement dates must use YYYY-MM-DD.');
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value)
    throw new PartnerSettlementError('INVALID_PERIOD', 'Enter valid settlement dates.');
  return parsed;
}

function commissionBasisPoints(): number {
  const value = Number(process.env.SETTLEMENT_COMMISSION_BPS ?? '1000');
  return Number.isInteger(value) && value >= 0 && value <= 5000 ? value : 1000;
}

export const partnerSettlementService = {
  async create(partnerId: string, periodStart: string, periodEnd: string) {
    const start = dateBoundary(periodStart, false);
    const end = dateBoundary(periodEnd, true);
    if (end < start || end.getTime() - start.getTime() > 1000 * 60 * 60 * 24 * 366)
      throw new PartnerSettlementError(
        'INVALID_PERIOD',
        'Settlement periods must be chronological and no longer than 366 days.',
      );
    const partner = await prisma.supplyPartner.findUnique({
      include: { properties: { select: { hotelSlug: true } } },
      where: { id: partnerId },
    });
    if (!partner)
      throw new PartnerSettlementError('PARTNER_NOT_FOUND', 'The supplier was not found.');
    const [hotelBookings, carReservations, busReservations] = await Promise.all([
      prisma.booking.findMany({
        select: { confirmationCode: true, totalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          hotelSlug: { in: partner.properties.map((property) => property.hotelSlug) },
          payment: { status: 'captured' },
        },
      }),
      prisma.partnerVehicleReservation.findMany({
        select: { confirmationCode: true, totalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          partnerId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      }),
      prisma.partnerBusReservation.findMany({
        select: { confirmationCode: true, totalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          partnerId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      }),
    ]);
    const lines = [...hotelBookings, ...carReservations, ...busReservations];
    const grossAmount = lines.reduce((total, line) => total + line.totalAmount, 0);
    const basisPoints = commissionBasisPoints();
    const commissionAmount = Math.round((grossAmount * basisPoints) / 10_000);
    return prisma.partnerSettlement.create({
      data: {
        bookingCount: lines.length,
        calculationJson: JSON.stringify({
          commissionBasisPoints: basisPoints,
          references: lines.map((line) => line.confirmationCode),
        }),
        commissionAmount,
        grossAmount,
        netAmount: grossAmount - commissionAmount,
        partnerId,
        periodEnd,
        periodStart,
      },
    });
  },

  async transition(
    id: string,
    action: 'APPROVE' | 'MARK_PAID',
    actorUserId: string,
    note: string,
    paymentReference?: string,
  ) {
    const settlement = await prisma.partnerSettlement.findUnique({ where: { id } });
    if (!settlement)
      throw new PartnerSettlementError('SETTLEMENT_NOT_FOUND', 'The settlement was not found.');
    if (action === 'APPROVE' && settlement.status !== 'DRAFT')
      throw new PartnerSettlementError(
        'INVALID_SETTLEMENT_STATE',
        'Only draft settlements can be approved.',
      );
    if (action === 'MARK_PAID' && settlement.status !== 'APPROVED')
      throw new PartnerSettlementError(
        'INVALID_SETTLEMENT_STATE',
        'Only approved settlements can be marked paid.',
      );
    const normalizedNote = note.trim().replace(/\s+/g, ' ').slice(0, 500);
    if (normalizedNote.length < 3)
      throw new PartnerSettlementError(
        'SETTLEMENT_NOTE_REQUIRED',
        'Add an audit note of at least 3 characters.',
      );
    if (
      action === 'MARK_PAID' &&
      (!paymentReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$/.test(paymentReference))
    )
      throw new PartnerSettlementError(
        'PAYMENT_REFERENCE_REQUIRED',
        'Enter a safe payment reference.',
      );
    return prisma.partnerSettlement.update({
      data:
        action === 'APPROVE'
          ? {
              approvedAt: new Date(),
              approvedByUserId: actorUserId,
              reviewNote: normalizedNote,
              status: 'APPROVED',
            }
          : { paidAt: new Date(), paymentReference, reviewNote: normalizedNote, status: 'PAID' },
      where: { id },
    });
  },
};
