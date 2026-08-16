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
    void start;
    void end;
    const bookings = await prisma.booking.findMany({
      include: {
        payment: { include: { allocations: true } },
        quote: { select: { checkOutDate: true } },
      },
      where: {
        hotelSlug: { in: partner.properties.map((property) => property.hotelSlug) },
        operationalStatus: 'CHECKED_OUT',
        payment: {
          environment: 'LIVE',
          reconciliationStatus: 'MATCHED',
          status: 'captured',
        },
        quote: { checkOutDate: { gte: periodStart, lte: periodEnd } },
        settlementLine: null,
        status: 'confirmed',
      },
    });
    const now = Date.now();
    const eligibleBookings = bookings.filter((booking) => {
      const eligibleAt =
        new Date(`${booking.quote.checkOutDate}T00:00:00.000Z`).getTime() +
        partner.settlementDelayDays * 86_400_000;
      return Number.isFinite(eligibleAt) && eligibleAt <= now;
    });
    if (eligibleBookings.length === 0) {
      throw new PartnerSettlementError(
        'NO_ELIGIBLE_TRANSACTIONS',
        'No checked-out, reconciled live payments are eligible for this settlement period.',
      );
    }
    const settlementLines = eligibleBookings.map((booking) => {
      if (!booking.payment) throw new Error('Eligible booking is missing its payment.');
      const allocation = (type: string) =>
        booking.payment?.allocations.find((item) => item.allocationType === type)?.amount ?? 0;
      const commissionAmount = allocation('PLATFORM_COMMISSION');
      const taxWithheldAmount = allocation('TAX_PAYABLE');
      const netAmount = allocation('SUPPLIER_PAYABLE');
      if (commissionAmount + taxWithheldAmount + netAmount !== booking.payment.amount) {
        throw new PartnerSettlementError(
          'PAYMENT_ALLOCATION_INVALID',
          `Payment allocations are incomplete for ${booking.confirmationCode}.`,
        );
      }
      return {
        bookingId: booking.id,
        commissionAmount,
        currency: booking.payment.currency,
        eligibleAt: new Date(
          new Date(`${booking.quote.checkOutDate}T00:00:00.000Z`).getTime() +
            partner.settlementDelayDays * 86_400_000,
        ),
        grossAmount: booking.payment.amount,
        netAmount,
        partnerId,
        reference: booking.confirmationCode,
        sourceId: booking.id,
        sourceType: 'HOTEL_BOOKING',
        taxWithheldAmount,
      };
    });
    const currency = settlementLines[0]?.currency;
    if (!currency || settlementLines.some((line) => line.currency !== currency)) {
      throw new PartnerSettlementError(
        'SETTLEMENT_CURRENCY_MISMATCH',
        'A settlement may contain only one currency.',
      );
    }
    const grossAmount = settlementLines.reduce((total, line) => total + line.grossAmount, 0);
    const commissionAmount = settlementLines.reduce(
      (total, line) => total + line.commissionAmount,
      0,
    );
    const netAmount = settlementLines.reduce((total, line) => total + line.netAmount, 0);
    return prisma.$transaction(async (transaction) =>
      transaction.partnerSettlement.create({
        data: {
          bookingCount: settlementLines.length,
          calculationJson: JSON.stringify({
            allocationSource: 'CAPTURE_JOURNAL',
            currency,
            settlementDelayDays: partner.settlementDelayDays,
          }),
          commissionAmount,
          grossAmount,
          lines: { create: settlementLines },
          netAmount,
          partnerId,
          periodEnd,
          periodStart,
        },
        include: { lines: true },
      }),
    );
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
