import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  calculateHotelFolioBalance,
  hotelFolioRequestFingerprint,
  requireHotelFolioIdempotencyKey,
} from '@/lib/pms/folio';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';
import {
  normalizeHotelFolioDiscount,
  normalizeHotelSplitPaymentAllocations,
  requireExpectedFolioBalance,
} from '@/lib/pms/splitBilling';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';
import { PartnerHotelFolioError } from '@/services/partnerHotelFolioService';

const MAX_FOLIO_ENTRIES = 100;

function balanceEntries(
  entries: Array<{
    amount: number;
    category: string;
    entryType: string;
    reversalOf: { entryType: string } | null;
  }>,
) {
  return entries.map((entry) => ({
    amount: entry.amount,
    category: entry.category,
    entryType: entry.entryType as 'CHARGE' | 'PAYMENT' | 'REVERSAL',
    reversalOfType: entry.reversalOf?.entryType as 'CHARGE' | 'PAYMENT' | undefined,
  }));
}

async function ownedBooking(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  partnerId: string,
  confirmationCode: string,
) {
  const properties = await transaction.partnerProperty.findMany({
    select: { hotelSlug: true, id: true, operationalDate: true, timezone: true },
    take: 101,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  if (properties.length > 100) {
    throw new PartnerHotelFolioError(
      'PROPERTY_LIMIT_REACHED',
      'The workspace is too large for a safe folio action.',
    );
  }
  const propertyBySlug = new Map(properties.map((property) => [property.hotelSlug, property]));
  const booking = await transaction.booking.findFirst({
    include: {
      folioEntries: {
        include: { reversalOf: { select: { entryType: true } } },
        orderBy: { createdAt: 'asc' },
        take: MAX_FOLIO_ENTRIES + 1,
      },
      payment: { select: { amount: true, status: true } },
      refunds: { select: { amount: true, status: true } },
    },
    where: {
      confirmationCode,
      hotelSlug: { in: [...propertyBySlug.keys()] },
      operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
      status: 'confirmed',
    },
  });
  const property = booking ? propertyBySlug.get(booking.hotelSlug) : undefined;
  if (!booking || !property) {
    throw new PartnerHotelFolioError(
      'BOOKING_NOT_FOUND',
      'The active stay was not found for this partner.',
    );
  }
  if (booking.folioEntries.length > MAX_FOLIO_ENTRIES) {
    throw new PartnerHotelFolioError(
      'FOLIO_LIMIT_REACHED',
      'The folio is too large to update safely from this workspace.',
    );
  }
  const totals = calculateHotelFolioBalance({
    bookingTotalAmount: booking.totalAmount,
    entries: balanceEntries(booking.folioEntries),
    onlinePayment: booking.payment,
    onlineRefunds: booking.refunds,
  });
  return { booking, property, totals };
}

function reference(value: string) {
  const confirmationCode = normalizeHotelBookingReference(value);
  if (!confirmationCode) {
    throw new PartnerHotelFolioError('INVALID_BOOKING_REFERENCE', 'Choose a valid active stay.');
  }
  return confirmationCode;
}

export async function applyHotelFolioDiscount(input: {
  actorIsAdmin: boolean;
  actorUserId: string;
  amount: unknown;
  confirmationCode: string;
  expectedBalance: unknown;
  idempotencyKey: string;
  partnerId: string;
  reason: unknown;
}) {
  if (!input.actorIsAdmin) {
    throw new PartnerHotelFolioError(
      'FINANCE_PERMISSION_REQUIRED',
      'Only a partner administrator can apply a folio discount.',
    );
  }
  const idempotencyKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  const confirmationCode = reference(input.confirmationCode);
  const discount = normalizeHotelFolioDiscount(input);
  const expectedBalance = requireExpectedFolioBalance(input.expectedBalance);
  const requestFingerprint = hotelFolioRequestFingerprint({
    actorUserId: input.actorUserId,
    confirmationCode,
    discount,
    expectedBalance,
    partnerId: input.partnerId,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelFolioEntry.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another discount.',
          );
        }
        return existing;
      }
      const { booking, property, totals } = await ownedBooking(
        transaction,
        input.partnerId,
        confirmationCode,
      );
      if (totals.balance !== expectedBalance) {
        throw new PartnerHotelFolioError(
          'STALE_FOLIO',
          'The folio balance changed. Refresh and review it before applying the discount.',
        );
      }
      if (discount.amount > totals.balance) {
        throw new PartnerHotelFolioError(
          'DISCOUNT_EXCEEDS_BALANCE',
          'The discount cannot exceed the outstanding folio balance.',
        );
      }
      const entry = await transaction.hotelFolioEntry.create({
        data: {
          amount: discount.amount,
          bookingId: booking.id,
          businessDate: resolveOperationalDate(property.operationalDate, property.timezone),
          category: 'DISCOUNT',
          currency: booking.currency,
          description: `Discount: ${discount.reason}`.slice(0, 160),
          entryType: 'CHARGE',
          idempotencyKey,
          postedByUserId: input.actorUserId,
          requestFingerprint,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_FOLIO_DISCOUNT_APPLIED',
          actorUserId: input.actorUserId,
          entityId: entry.id,
          entityType: 'HOTEL_FOLIO_ENTRY',
          metadataJson: JSON.stringify({
            amount: discount.amount,
            confirmationCode,
            currency: booking.currency,
            newBalance: totals.balance - discount.amount,
            previousBalance: totals.balance,
            reason: discount.reason,
          }),
          partnerId: input.partnerId,
          summary: `Discount applied to ${confirmationCode}.`,
        },
      });
      return entry;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function postHotelSplitPayment(input: {
  actorIsAdmin: boolean;
  actorUserId: string;
  allocations: unknown;
  confirmationCode: string;
  expectedBalance: unknown;
  idempotencyKey: string;
  partnerId: string;
}) {
  if (!input.actorIsAdmin) {
    throw new PartnerHotelFolioError(
      'FINANCE_PERMISSION_REQUIRED',
      'Only a partner administrator can record a split payment.',
    );
  }
  const baseKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  if (baseKey.length > 93) {
    throw new PartnerHotelFolioError(
      'INVALID_IDEMPOTENCY_KEY',
      'Start this split payment again and retry.',
    );
  }
  const confirmationCode = reference(input.confirmationCode);
  const allocations = normalizeHotelSplitPaymentAllocations(input.allocations);
  const expectedBalance = requireExpectedFolioBalance(input.expectedBalance);
  const requestFingerprint = hotelFolioRequestFingerprint({
    allocations,
    actorUserId: input.actorUserId,
    confirmationCode,
    expectedBalance,
    partnerId: input.partnerId,
  });
  return prisma.$transaction(
    async (transaction) => {
      const firstKey = `${baseKey}_01`;
      const existing = await transaction.hotelFolioEntry.findUnique({
        where: { idempotencyKey: firstKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another split payment.',
          );
        }
        return [existing];
      }
      const { booking, property, totals } = await ownedBooking(
        transaction,
        input.partnerId,
        confirmationCode,
      );
      if (totals.balance !== expectedBalance) {
        throw new PartnerHotelFolioError(
          'STALE_FOLIO',
          'The folio balance changed. Refresh and review it before recording payment.',
        );
      }
      const allocationTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      if (allocationTotal !== totals.balance) {
        throw new PartnerHotelFolioError(
          'SPLIT_TOTAL_MISMATCH',
          `Split allocations must equal the current INR ${totals.balance} balance.`,
        );
      }
      const shift = await transaction.hotelCashierShift.findUnique({
        where: { activeKey: `${property.id}:${input.actorUserId}` },
      });
      if (!shift) {
        throw new PartnerHotelFolioError(
          'OPEN_SHIFT_REQUIRED',
          'Open a cashier shift for this property before recording split payment.',
        );
      }
      const businessDate = resolveOperationalDate(property.operationalDate, property.timezone);
      const entries = [];
      for (const [index, allocation] of allocations.entries()) {
        entries.push(
          await transaction.hotelFolioEntry.create({
            data: {
              amount: allocation.amount,
              bookingId: booking.id,
              businessDate,
              cashierShiftId: shift.id,
              category: allocation.category,
              currency: booking.currency,
              description: `Split bill: ${allocation.payer}`.slice(0, 160),
              entryType: 'PAYMENT',
              idempotencyKey: `${baseKey}_${String(index + 1).padStart(2, '0')}`,
              postedByUserId: input.actorUserId,
              requestFingerprint,
            },
          }),
        );
      }
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_FOLIO_SPLIT_PAYMENT_POSTED',
          actorUserId: input.actorUserId,
          entityId: entries[0].id,
          entityType: 'HOTEL_FOLIO_ENTRY',
          metadataJson: JSON.stringify({
            allocations,
            confirmationCode,
            currency: booking.currency,
            entryIds: entries.map((entry) => entry.id),
            previousBalance: totals.balance,
          }),
          partnerId: input.partnerId,
          summary: `Split payment posted to ${confirmationCode}.`,
        },
      });
      return entries;
    },
    { isolationLevel: 'Serializable' },
  );
}
