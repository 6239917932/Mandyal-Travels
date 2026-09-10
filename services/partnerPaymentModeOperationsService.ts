import 'server-only';

import { prisma } from '@/lib/prisma';
import { HOTEL_FOLIO_PAYMENT_CATEGORIES } from '@/lib/pms/folio';

const MAX_PROPERTIES = 100;
const MAX_ENTRIES = 500;
const MAX_ONLINE_PAYMENTS = 250;
const MAX_SHIFTS = 250;

export async function getPartnerPaymentModeOperations(partnerId: string) {
  const properties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { hotelSlug: true, id: true },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId },
  });
  const boundedProperties = properties.slice(0, MAX_PROPERTIES);
  const hotelSlugs = boundedProperties.map((property) => property.hotelSlug);
  const propertyIds = boundedProperties.map((property) => property.id);
  const [entries, onlinePayments, cashierShifts] = hotelSlugs.length
    ? await Promise.all([
        prisma.hotelFolioEntry.findMany({
          include: {
            booking: { select: { confirmationCode: true } },
            reversalOf: { select: { category: true, entryType: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: MAX_ENTRIES + 1,
          where: {
            booking: { hotelSlug: { in: hotelSlugs } },
            OR: [
              { category: { in: [...HOTEL_FOLIO_PAYMENT_CATEGORIES] }, entryType: 'PAYMENT' },
              {
                entryType: 'REVERSAL',
                reversalOf: {
                  is: {
                    category: { in: [...HOTEL_FOLIO_PAYMENT_CATEGORIES] },
                    entryType: 'PAYMENT',
                  },
                },
              },
            ],
          },
        }),
        prisma.paymentTransaction.findMany({
          include: { booking: { select: { confirmationCode: true } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: MAX_ONLINE_PAYMENTS + 1,
          where: { booking: { hotelSlug: { in: hotelSlugs } } },
        }),
        prisma.hotelCashierShift.findMany({
          orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
          select: {
            businessDate: true,
            closedAt: true,
            declaredClosingAmount: true,
            openedAt: true,
            openingFloatAmount: true,
            status: true,
          },
          take: MAX_SHIFTS + 1,
          where: { partnerId, propertyId: { in: propertyIds } },
        }),
      ])
    : [[], [], []];
  const boundedEntries = entries.slice(0, MAX_ENTRIES);
  const modes = HOTEL_FOLIO_PAYMENT_CATEGORIES.map((category) => {
    const matching = boundedEntries.filter(
      (entry) =>
        entry.category === category ||
        (entry.entryType === 'REVERSAL' && entry.reversalOf?.category === category),
    );
    const payments = matching.filter((entry) => entry.entryType === 'PAYMENT');
    const reversals = matching.filter((entry) => entry.entryType === 'REVERSAL');
    return {
      category,
      currencyTotals: [...new Set(matching.map((entry) => entry.currency))].map((currency) => ({
        amount: matching.reduce((total, entry) => {
          if (entry.currency !== currency) return total;
          return total + (entry.entryType === 'REVERSAL' ? -entry.amount : entry.amount);
        }, 0),
        currency,
      })),
      paymentCount: payments.length,
      reversalCount: reversals.length,
    };
  });
  const boundedOnlinePayments = onlinePayments.slice(0, MAX_ONLINE_PAYMENTS);

  return {
    cashier: {
      closedShifts: cashierShifts.slice(0, MAX_SHIFTS).filter((shift) => shift.status === 'CLOSED')
        .length,
      openShifts: cashierShifts.slice(0, MAX_SHIFTS).filter((shift) => shift.status === 'OPEN')
        .length,
      recent: cashierShifts.slice(0, 10),
    },
    modes,
    online: {
      capturedCount: boundedOnlinePayments.filter(
        (payment) => payment.status.toUpperCase() === 'CAPTURED',
      ).length,
      providerAcknowledgedCount: boundedOnlinePayments.filter((payment) =>
        Boolean(payment.providerRef.trim()),
      ).length,
      recent: boundedOnlinePayments.slice(0, 20).map((payment) => ({
        amount: payment.amount,
        confirmationCode: payment.booking.confirmationCode,
        createdAt: payment.createdAt,
        currency: payment.currency,
        environment: payment.environment,
        provider: payment.provider.slice(0, 40),
        providerAcknowledgementRecorded: Boolean(payment.providerRef.trim()),
        reconciliationStatus: payment.reconciliationStatus,
        status: payment.status,
      })),
      totalCount: boundedOnlinePayments.length,
    },
    recentPropertyEntries: boundedEntries.slice(0, 20).map((entry) => ({
      amount: entry.amount,
      businessDate: entry.businessDate,
      category:
        entry.entryType === 'REVERSAL'
          ? (entry.reversalOf?.category ?? entry.category)
          : entry.category,
      confirmationCode: entry.booking.confirmationCode,
      createdAt: entry.createdAt,
      currency: entry.currency,
      description: entry.description,
      entryType: entry.entryType,
    })),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES ||
      entries.length > MAX_ENTRIES ||
      onlinePayments.length > MAX_ONLINE_PAYMENTS ||
      cashierShifts.length > MAX_SHIFTS,
  } as const;
}
