import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  calculateExpectedCash,
  calculateHotelFolioBalance,
  hotelFolioRequestFingerprint,
  normalizeCashierClosingAmount,
  normalizeCashierOpeningAmount,
  normalizeFolioReversalReason,
  normalizeHotelFolioPosting,
  requireHotelFolioIdempotencyKey,
} from '@/lib/pms/folio';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';

const MAX_PROPERTIES = 100;
const MAX_FOLIOS = 200;
const MAX_FOLIO_ENTRIES = 100;

export class PartnerHotelFolioError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function dateInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

type StoredFolioEntry = {
  amount: number;
  businessDate: string;
  category: string;
  createdAt: Date;
  description: string;
  entryType: string;
  id: string;
  reversalOf: { entryType: string } | null;
  reversalOfId: string | null;
  reversedBy?: { id: string } | null;
};

function presentEntry(entry: StoredFolioEntry) {
  return {
    amount: entry.amount,
    businessDate: entry.businessDate,
    category: entry.category,
    createdAt: entry.createdAt.toISOString(),
    description: entry.description,
    entryType: entry.entryType,
    id: entry.id,
    reversalOfId: entry.reversalOfId ?? undefined,
    reversalOfType: entry.reversalOf?.entryType,
    reversed: Boolean(entry.reversedBy),
  } as const;
}

function balanceEntries(entries: StoredFolioEntry[]) {
  return entries.map((entry) => ({
    amount: entry.amount,
    entryType: entry.entryType as 'CHARGE' | 'PAYMENT' | 'REVERSAL',
    reversalOfType: entry.reversalOf?.entryType as 'CHARGE' | 'PAYMENT' | undefined,
  }));
}

function cashEntries(entries: StoredFolioEntry[]) {
  return entries.map((entry) => ({
    amount: entry.amount,
    category: entry.category,
    entryType: entry.entryType as 'CHARGE' | 'PAYMENT' | 'REVERSAL',
    reversalOfType: entry.reversalOf?.entryType as 'CHARGE' | 'PAYMENT' | undefined,
  }));
}

async function ownedProperties(client: Pick<typeof prisma, 'partnerProperty'>, partnerId: string) {
  return client.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: { displayName: true, hotelSlug: true, id: true, timezone: true },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
}

export async function getPartnerHotelFolioWorkspace(input: {
  actorUserId?: string;
  partnerId: string;
  requestedConfirmationCode?: string;
}) {
  const properties = await ownedProperties(prisma, input.partnerId);
  const boundedProperties = properties.slice(0, MAX_PROPERTIES);
  const propertyBySlug = new Map(
    boundedProperties.map((property) => [property.hotelSlug, property]),
  );
  const bookings = await prisma.booking.findMany({
    include: {
      folioEntries: {
        include: {
          reversalOf: { select: { entryType: true } },
          reversedBy: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_FOLIO_ENTRIES + 1,
      },
      guest: { select: { firstName: true, lastName: true } },
      payment: { select: { amount: true, provider: true, status: true } },
      quote: { select: { checkInDate: true, checkOutDate: true } },
      refunds: { select: { amount: true, status: true } },
    },
    orderBy: [{ quote: { checkInDate: 'asc' } }, { createdAt: 'asc' }],
    take: MAX_FOLIOS + 1,
    where: {
      hotelSlug: { in: [...propertyBySlug.keys()] },
      operationalStatus: { in: ['RESERVED', 'CHECKED_IN'] },
      status: 'confirmed',
    },
  });
  const boundedBookings = bookings.slice(0, MAX_FOLIOS);
  const requestedReference = normalizeHotelBookingReference(input.requestedConfirmationCode ?? '');
  const selectedBooking =
    boundedBookings.find((booking) => booking.confirmationCode === requestedReference) ??
    boundedBookings[0];
  const selectedProperty = selectedBooking
    ? propertyBySlug.get(selectedBooking.hotelSlug)
    : boundedProperties[0];
  const activeShift =
    selectedProperty && input.actorUserId
      ? await prisma.hotelCashierShift.findUnique({
          include: {
            folioEntries: {
              include: { reversalOf: { select: { entryType: true } } },
              orderBy: { createdAt: 'asc' },
              take: MAX_FOLIO_ENTRIES + 1,
            },
          },
          where: { activeKey: `${selectedProperty.id}:${input.actorUserId}` },
        })
      : null;
  const selectedEntries = selectedBooking?.folioEntries.slice(0, MAX_FOLIO_ENTRIES) ?? [];
  const totals = selectedBooking
    ? calculateHotelFolioBalance({
        bookingTotalAmount: selectedBooking.totalAmount,
        entries: balanceEntries(selectedEntries),
        onlinePayment: selectedBooking.payment,
        onlineRefunds: selectedBooking.refunds,
      })
    : undefined;

  return {
    activeShift: activeShift
      ? {
          businessDate: activeShift.businessDate,
          expectedCashAmount: calculateExpectedCash({
            entries: cashEntries(activeShift.folioEntries.slice(0, MAX_FOLIO_ENTRIES)),
            openingFloatAmount: activeShift.openingFloatAmount,
          }),
          id: activeShift.id,
          openedAt: activeShift.openedAt.toISOString(),
          openingFloatAmount: activeShift.openingFloatAmount,
          version: activeShift.version,
        }
      : undefined,
    properties: boundedProperties.map((property) => ({
      businessDate: dateInTimezone(property.timezone),
      id: property.id,
      name: property.displayName,
    })),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES ||
      bookings.length > MAX_FOLIOS ||
      Boolean(
        selectedBooking?.folioEntries.length &&
        selectedBooking.folioEntries.length > MAX_FOLIO_ENTRIES,
      ) ||
      Boolean(
        activeShift?.folioEntries.length && activeShift.folioEntries.length > MAX_FOLIO_ENTRIES,
      ),
    selectedFolio:
      selectedBooking && selectedProperty && totals
        ? {
            accommodationAmount: selectedBooking.totalAmount,
            balance: totals.balance,
            charges: totals.charges,
            checkInDate: selectedBooking.quote.checkInDate,
            checkOutDate: selectedBooking.quote.checkOutDate,
            confirmationCode: selectedBooking.confirmationCode,
            currency: selectedBooking.currency,
            entries: selectedEntries.map(presentEntry),
            guestName: selectedBooking.guest
              ? `${selectedBooking.guest.firstName} ${selectedBooking.guest.lastName}`
                  .trim()
                  .slice(0, 100)
              : 'Primary guest unavailable',
            onlinePayment:
              selectedBooking.payment?.status.toLowerCase() === 'captured'
                ? {
                    amount: selectedBooking.payment.amount,
                    provider: selectedBooking.payment.provider.slice(0, 40),
                  }
                : undefined,
            onlineRefundAmount: totals.approvedRefunds,
            operationalStatus: selectedBooking.operationalStatus,
            payments: totals.payments,
            propertyId: selectedProperty.id,
            propertyName: selectedProperty.displayName,
          }
        : undefined,
    stays: boundedBookings.map((booking) => ({
      confirmationCode: booking.confirmationCode,
      guestName: booking.guest
        ? `${booking.guest.firstName} ${booking.guest.lastName}`.trim().slice(0, 100)
        : 'Primary guest unavailable',
      propertyName: propertyBySlug.get(booking.hotelSlug)?.displayName ?? 'Managed property',
    })),
  } as const;
}

export async function openHotelCashierShift(input: {
  actorUserId: string;
  idempotencyKey: string;
  openingFloatAmount: unknown;
  partnerId: string;
  propertyId: string;
}) {
  const idempotencyKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  const openingFloatAmount = normalizeCashierOpeningAmount(input.openingFloatAmount);
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelCashierShift.findUnique({
        where: { openIdempotencyKey: idempotencyKey },
      });
      if (existing) {
        if (
          existing.partnerId !== input.partnerId ||
          existing.propertyId !== input.propertyId ||
          existing.openedByUserId !== input.actorUserId ||
          existing.openingFloatAmount !== openingFloatAmount
        ) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another cashier action.',
          );
        }
        return existing;
      }
      const property = await transaction.partnerProperty.findFirst({
        where: {
          id: input.propertyId,
          listingSource: 'MANAGED',
          partnerId: input.partnerId,
          status: 'ACTIVE',
        },
      });
      if (!property) {
        throw new PartnerHotelFolioError(
          'PROPERTY_NOT_FOUND',
          'Choose an active managed property assigned to this partner.',
        );
      }
      const activeKey = `${property.id}:${input.actorUserId}`;
      if (await transaction.hotelCashierShift.findUnique({ where: { activeKey } })) {
        throw new PartnerHotelFolioError(
          'SHIFT_ALREADY_OPEN',
          'Close the current cashier shift before opening another one.',
        );
      }
      const shift = await transaction.hotelCashierShift.create({
        data: {
          activeKey,
          businessDate: dateInTimezone(property.timezone),
          openIdempotencyKey: idempotencyKey,
          openedByUserId: input.actorUserId,
          openingFloatAmount,
          partnerId: input.partnerId,
          propertyId: property.id,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_CASHIER_SHIFT_OPENED',
          actorUserId: input.actorUserId,
          entityId: shift.id,
          entityType: 'HOTEL_CASHIER_SHIFT',
          metadataJson: JSON.stringify({
            businessDate: shift.businessDate,
            openingFloatAmount,
            propertyId: property.id,
          }),
          partnerId: input.partnerId,
          summary: `Cashier shift opened for ${property.displayName}.`,
        },
      });
      return shift;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function closeHotelCashierShift(input: {
  actorUserId: string;
  declaredClosingAmount: unknown;
  idempotencyKey: string;
  partnerId: string;
  shiftId: string;
  version: number;
}) {
  const idempotencyKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  const declaredClosingAmount = normalizeCashierClosingAmount(input.declaredClosingAmount);
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new PartnerHotelFolioError('STALE_SHIFT', 'Refresh the cashier shift and try again.');
  }
  return prisma.$transaction(
    async (transaction) => {
      const shift = await transaction.hotelCashierShift.findFirst({
        include: {
          folioEntries: {
            include: { reversalOf: { select: { entryType: true } } },
            orderBy: { createdAt: 'asc' },
            take: MAX_FOLIO_ENTRIES + 1,
          },
          property: { select: { displayName: true } },
        },
        where: { id: input.shiftId, partnerId: input.partnerId },
      });
      if (!shift) {
        throw new PartnerHotelFolioError('SHIFT_NOT_FOUND', 'The cashier shift was not found.');
      }
      if (shift.closeIdempotencyKey === idempotencyKey) {
        if (
          shift.closedByUserId !== input.actorUserId ||
          shift.declaredClosingAmount !== declaredClosingAmount
        ) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another cashier action.',
          );
        }
        return shift;
      }
      if (
        shift.status !== 'OPEN' ||
        shift.openedByUserId !== input.actorUserId ||
        shift.version !== input.version
      ) {
        throw new PartnerHotelFolioError(
          'STALE_SHIFT',
          'This cashier shift changed or belongs to another cashier. Refresh and try again.',
        );
      }
      if (shift.folioEntries.length > MAX_FOLIO_ENTRIES) {
        throw new PartnerHotelFolioError(
          'SHIFT_LIMIT_REACHED',
          'The shift is too large to close safely from this workspace.',
        );
      }
      const expectedCashAmount = calculateExpectedCash({
        entries: cashEntries(shift.folioEntries),
        openingFloatAmount: shift.openingFloatAmount,
      });
      if (declaredClosingAmount !== expectedCashAmount) {
        throw new PartnerHotelFolioError(
          'CASH_MISMATCH',
          `Declared cash must equal the expected INR ${expectedCashAmount}.`,
        );
      }
      const result = await transaction.hotelCashierShift.updateMany({
        data: {
          activeKey: null,
          closeIdempotencyKey: idempotencyKey,
          closedAt: new Date(),
          closedByUserId: input.actorUserId,
          declaredClosingAmount,
          status: 'CLOSED',
          version: { increment: 1 },
        },
        where: { id: shift.id, status: 'OPEN', version: input.version },
      });
      if (result.count !== 1) {
        throw new PartnerHotelFolioError('STALE_SHIFT', 'Refresh the cashier shift and try again.');
      }
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_CASHIER_SHIFT_CLOSED',
          actorUserId: input.actorUserId,
          entityId: shift.id,
          entityType: 'HOTEL_CASHIER_SHIFT',
          metadataJson: JSON.stringify({
            businessDate: shift.businessDate,
            declaredClosingAmount,
            expectedCashAmount,
            propertyId: shift.propertyId,
          }),
          partnerId: input.partnerId,
          summary: `Cashier shift closed for ${shift.property.displayName}.`,
        },
      });
      return { ...shift, declaredClosingAmount, status: 'CLOSED', version: shift.version + 1 };
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function postHotelFolioEntry(input: {
  actorIsAdmin: boolean;
  actorUserId: string;
  confirmationCode: string;
  idempotencyKey: string;
  partnerId: string;
  posting: Parameters<typeof normalizeHotelFolioPosting>[0];
}) {
  const idempotencyKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  const posting = normalizeHotelFolioPosting(input.posting);
  if (posting.entryType === 'PAYMENT' && !input.actorIsAdmin) {
    throw new PartnerHotelFolioError(
      'FINANCE_PERMISSION_REQUIRED',
      'Only a partner administrator can record a payment.',
    );
  }
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  if (!confirmationCode) {
    throw new PartnerHotelFolioError('INVALID_BOOKING_REFERENCE', 'Choose a valid active stay.');
  }
  const requestFingerprint = hotelFolioRequestFingerprint({ confirmationCode, posting });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelFolioEntry.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another folio posting.',
          );
        }
        return existing;
      }
      const properties = await ownedProperties(transaction, input.partnerId);
      const propertyBySlug = new Map(
        properties.slice(0, MAX_PROPERTIES).map((property) => [property.hotelSlug, property]),
      );
      const booking = await transaction.booking.findFirst({
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
      const shift =
        posting.entryType === 'PAYMENT'
          ? await transaction.hotelCashierShift.findUnique({
              where: { activeKey: `${property.id}:${input.actorUserId}` },
            })
          : null;
      if (posting.entryType === 'PAYMENT' && !shift) {
        throw new PartnerHotelFolioError(
          'OPEN_SHIFT_REQUIRED',
          'Open a cashier shift for this property before recording a payment.',
        );
      }
      const entry = await transaction.hotelFolioEntry.create({
        data: {
          ...posting,
          bookingId: booking.id,
          businessDate: dateInTimezone(property.timezone),
          cashierShiftId: shift?.id,
          currency: booking.currency,
          idempotencyKey,
          postedByUserId: input.actorUserId,
          requestFingerprint,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: `HOTEL_FOLIO_${posting.entryType}_POSTED`,
          actorUserId: input.actorUserId,
          entityId: entry.id,
          entityType: 'HOTEL_FOLIO_ENTRY',
          metadataJson: JSON.stringify({
            amount: posting.amount,
            businessDate: entry.businessDate,
            category: posting.category,
            confirmationCode,
            currency: entry.currency,
          }),
          partnerId: input.partnerId,
          summary: `${posting.entryType === 'CHARGE' ? 'Charge' : 'Payment'} posted to ${confirmationCode}.`,
        },
      });
      return entry;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function reverseHotelFolioEntry(input: {
  actorUserId: string;
  confirmationCode: string;
  entryId: string;
  idempotencyKey: string;
  partnerId: string;
  reason: unknown;
}) {
  const idempotencyKey = requireHotelFolioIdempotencyKey(input.idempotencyKey);
  const reason = normalizeFolioReversalReason(input.reason);
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  const requestFingerprint = hotelFolioRequestFingerprint({
    confirmationCode,
    entryId: input.entryId,
    reason,
  });
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.hotelFolioEntry.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new PartnerHotelFolioError(
            'IDEMPOTENCY_KEY_REUSED',
            'This retry key is already connected to another folio correction.',
          );
        }
        return existing;
      }
      const properties = await ownedProperties(transaction, input.partnerId);
      const propertyBySlug = new Map(
        properties.slice(0, MAX_PROPERTIES).map((property) => [property.hotelSlug, property]),
      );
      const booking = await transaction.booking.findFirst({
        where: {
          confirmationCode,
          hotelSlug: { in: [...propertyBySlug.keys()] },
          status: 'confirmed',
        },
      });
      const property = booking ? propertyBySlug.get(booking.hotelSlug) : undefined;
      if (!booking || !property) {
        throw new PartnerHotelFolioError('BOOKING_NOT_FOUND', 'The folio was not found.');
      }
      const original = await transaction.hotelFolioEntry.findFirst({
        include: { reversedBy: { select: { id: true } } },
        where: { bookingId: booking.id, id: input.entryId },
      });
      if (!original || original.entryType === 'REVERSAL') {
        throw new PartnerHotelFolioError('ENTRY_NOT_FOUND', 'Choose a valid original posting.');
      }
      if (original.reversedBy) {
        throw new PartnerHotelFolioError(
          'ENTRY_ALREADY_REVERSED',
          'This posting is already reversed.',
        );
      }
      const shift =
        original.entryType === 'PAYMENT'
          ? await transaction.hotelCashierShift.findUnique({
              where: { activeKey: `${property.id}:${input.actorUserId}` },
            })
          : null;
      if (original.entryType === 'PAYMENT' && !shift) {
        throw new PartnerHotelFolioError(
          'OPEN_SHIFT_REQUIRED',
          'Open a cashier shift before reversing a payment.',
        );
      }
      const reversal = await transaction.hotelFolioEntry.create({
        data: {
          amount: original.amount,
          bookingId: booking.id,
          businessDate: dateInTimezone(property.timezone),
          cashierShiftId: shift?.id,
          category: original.category,
          currency: original.currency,
          description: `Reversal: ${reason}`.slice(0, 260),
          entryType: 'REVERSAL',
          idempotencyKey,
          postedByUserId: input.actorUserId,
          requestFingerprint,
          reversalOfId: original.id,
        },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'HOTEL_FOLIO_ENTRY_REVERSED',
          actorUserId: input.actorUserId,
          entityId: reversal.id,
          entityType: 'HOTEL_FOLIO_ENTRY',
          metadataJson: JSON.stringify({
            amount: reversal.amount,
            businessDate: reversal.businessDate,
            confirmationCode,
            currency: reversal.currency,
            reversalOfId: original.id,
          }),
          partnerId: input.partnerId,
          summary: `A folio posting was reversed for ${confirmationCode}.`,
        },
      });
      return reversal;
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function assertHotelFolioSettledForCheckout(
  transaction: Prisma.TransactionClient,
  bookingId: string,
) {
  const booking = await transaction.booking.findUnique({
    include: {
      folioEntries: { include: { reversalOf: { select: { entryType: true } } } },
      payment: { select: { amount: true, status: true } },
      refunds: { select: { amount: true, status: true } },
    },
    where: { id: bookingId },
  });
  if (!booking) {
    throw new PartnerHotelFolioError('BOOKING_NOT_FOUND', 'The hotel booking was not found.');
  }
  const totals = calculateHotelFolioBalance({
    bookingTotalAmount: booking.totalAmount,
    entries: balanceEntries(booking.folioEntries.map((entry) => ({ ...entry, reversedBy: null }))),
    onlinePayment: booking.payment,
    onlineRefunds: booking.refunds,
  });
  if (totals.balance > 0) {
    throw new PartnerHotelFolioError(
      'OUTSTANDING_FOLIO_BALANCE',
      `Collect or settle the remaining INR ${totals.balance} before checkout.`,
    );
  }
}
