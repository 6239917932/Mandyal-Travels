import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  buildHotelOperationalReport,
  normalizeHotelOperationalReportRange,
} from '@/lib/pms/operationalReport';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';
import { normalizeHotelBookingReference } from '@/services/customerHotelBookingDetailRules';

const MAX_PROPERTIES = 100;
const MAX_ACTIVITY_ROWS = 5_000;
const MAX_GST_STATEMENTS = 500;
const MAX_FOLIO_ENTRIES = 250;

export class PartnerHotelReportingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function requireFinanceAccess(memberRole?: string) {
  if (memberRole !== 'ADMIN') {
    throw new PartnerHotelReportingError(
      'FINANCE_ACCESS_REQUIRED',
      'A hotel partner administrator is required to view financial reports.',
    );
  }
}

async function ownedProperties(partnerId: string) {
  return prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: {
      displayName: true,
      hotelSlug: true,
      id: true,
      operationalDate: true,
      timezone: true,
    },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
}

export async function getPartnerHotelOperationalReport(input: {
  from?: string;
  memberRole?: string;
  partnerId: string;
  requestedPropertyId?: string;
  through?: string;
}) {
  requireFinanceAccess(input.memberRole);
  const storedProperties = await ownedProperties(input.partnerId);
  const properties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    properties.find((property) => property.id === input.requestedPropertyId) ?? properties[0];
  if (!selected) {
    return {
      properties: [],
      safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
    } as const;
  }
  const businessDate = resolveOperationalDate(selected.operationalDate, selected.timezone);
  const range = normalizeHotelOperationalReportRange({
    defaultThrough: businessDate,
    from: input.from,
    through: input.through,
  });
  const [bookings, folioEntries, serviceOrders, shifts, closes] = await Promise.all([
    prisma.booking.findMany({
      select: { quote: { select: { checkInDate: true, checkOutDate: true, rooms: true } } },
      take: MAX_ACTIVITY_ROWS + 1,
      where: {
        hotelSlug: selected.hotelSlug,
        status: 'confirmed',
        OR: [
          { quote: { checkInDate: { gte: range.from, lte: range.through } } },
          { quote: { checkOutDate: { gte: range.from, lte: range.through } } },
        ],
      },
    }),
    prisma.hotelFolioEntry.findMany({
      include: { reversalOf: { select: { entryType: true } } },
      orderBy: { createdAt: 'asc' },
      take: MAX_ACTIVITY_ROWS + 1,
      where: {
        booking: { hotelSlug: selected.hotelSlug },
        businessDate: { gte: range.from, lte: range.through },
      },
    }),
    prisma.hotelPosOrder.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        businessDate: true,
        currency: true,
        serviceMode: true,
        status: true,
        totalAmount: true,
      },
      take: MAX_ACTIVITY_ROWS + 1,
      where: { businessDate: { gte: range.from, lte: range.through }, propertyId: selected.id },
    }),
    prisma.hotelCashierShift.findMany({
      orderBy: { openedAt: 'asc' },
      select: { businessDate: true, status: true },
      take: MAX_ACTIVITY_ROWS + 1,
      where: { businessDate: { gte: range.from, lte: range.through }, propertyId: selected.id },
    }),
    prisma.hotelNightAuditClose.findMany({
      orderBy: { closedAt: 'asc' },
      select: { businessDate: true },
      take: MAX_ACTIVITY_ROWS + 1,
      where: { businessDate: { gte: range.from, lte: range.through }, propertyId: selected.id },
    }),
  ]);
  const safetyLimitReached =
    storedProperties.length > MAX_PROPERTIES ||
    bookings.length > MAX_ACTIVITY_ROWS ||
    folioEntries.length > MAX_ACTIVITY_ROWS ||
    serviceOrders.length > MAX_ACTIVITY_ROWS ||
    shifts.length > MAX_ACTIVITY_ROWS ||
    closes.length > MAX_ACTIVITY_ROWS;
  const currencies = new Set([
    ...folioEntries.map((entry) => entry.currency),
    ...serviceOrders.map((order) => order.currency),
  ]);
  const currency = currencies.size === 1 ? ([...currencies][0] ?? 'INR') : 'INR';
  const currencyConflict = currencies.size > 1 || !/^[A-Z]{3}$/.test(currency);
  const report = buildHotelOperationalReport({
    bookings: bookings.slice(0, MAX_ACTIVITY_ROWS).map((booking) => booking.quote),
    closes: closes.slice(0, MAX_ACTIVITY_ROWS),
    dates: range.dates,
    folioEntries: folioEntries.slice(0, MAX_ACTIVITY_ROWS).map((entry) => ({
      amount: entry.amount,
      businessDate: entry.businessDate,
      category: entry.category,
      entryType: entry.entryType,
      reversalOfType: entry.reversalOf?.entryType,
    })),
    serviceOrders: serviceOrders.slice(0, MAX_ACTIVITY_ROWS),
    shifts: shifts.slice(0, MAX_ACTIVITY_ROWS),
  });
  return {
    businessDate,
    currency,
    currencyConflict,
    financialComplete: !safetyLimitReached && !currencyConflict,
    ...range,
    ...report,
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    safetyLimitReached,
    selectedProperty: { id: selected.id, name: selected.displayName },
  } as const;
}

function netSupplementalCharges(
  entries: readonly {
    amount: number;
    category: string;
    entryType: string;
    reversalOf: { entryType: string } | null;
  }[],
) {
  return entries.reduce((total, entry) => {
    if (entry.entryType === 'CHARGE') {
      return total + (entry.category === 'DISCOUNT' ? -entry.amount : entry.amount);
    }
    if (entry.entryType === 'REVERSAL' && entry.reversalOf?.entryType === 'CHARGE') {
      return total + (entry.category === 'DISCOUNT' ? entry.amount : -entry.amount);
    }
    return total;
  }, 0);
}

async function gstIdentity(partnerId: string) {
  return prisma.supplyPartner.findUnique({
    select: {
      applications: {
        orderBy: { reviewedAt: 'desc' },
        select: { legalBusinessName: true, registeredAddress: true, taxIdentifier: true },
        take: 1,
        where: { kycStatus: 'VERIFIED', status: 'APPROVED' },
      },
      name: true,
      taxProfile: true,
    },
    where: { id: partnerId },
  });
}

function presentGstBooking(booking: {
  confirmationCode: string;
  createdAt: Date;
  currency: string;
  folioEntries: Array<{
    amount: number;
    category: string;
    currency: string;
    entryType: string;
    reversalOf: { entryType: string } | null;
  }>;
  guest: { firstName: string; lastName: string } | null;
  quote: { checkInDate: string; checkOutDate: string };
  taxSnapshot: {
    customerTaxableAmount: number;
    customerTotalAmount: number;
    ruleVersion: string;
    serviceGstAmount: number;
  } | null;
}) {
  const supplementalCurrencyConflict = booking.folioEntries.some(
    (entry) => entry.currency !== booking.currency,
  );
  return {
    confirmationCode: booking.confirmationCode,
    createdAt: booking.createdAt.toISOString(),
    currency: booking.currency,
    customerName: booking.guest
      ? `${booking.guest.firstName} ${booking.guest.lastName}`.trim().slice(0, 100)
      : 'Primary guest unavailable',
    from: booking.quote.checkInDate,
    gstAmount: booking.taxSnapshot?.serviceGstAmount ?? 0,
    ruleVersion: booking.taxSnapshot?.ruleVersion ?? '',
    supplementalChargeAmount: supplementalCurrencyConflict
      ? 0
      : netSupplementalCharges(booking.folioEntries.slice(0, MAX_FOLIO_ENTRIES)),
    supplementalCurrencyConflict,
    taxableAmount: booking.taxSnapshot?.customerTaxableAmount ?? 0,
    through: booking.quote.checkOutDate,
    totalAmount: booking.taxSnapshot?.customerTotalAmount ?? 0,
  } as const;
}

export async function getPartnerHotelGstWorkspace(input: {
  memberRole?: string;
  partnerId: string;
  requestedPropertyId?: string;
}) {
  requireFinanceAccess(input.memberRole);
  const [storedProperties, partner] = await Promise.all([
    ownedProperties(input.partnerId),
    gstIdentity(input.partnerId),
  ]);
  const properties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    properties.find((property) => property.id === input.requestedPropertyId) ?? properties[0];
  if (!selected || !partner) {
    return {
      properties: [],
      safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
    } as const;
  }
  const bookings = await prisma.booking.findMany({
    include: {
      folioEntries: {
        include: { reversalOf: { select: { entryType: true } } },
        take: MAX_FOLIO_ENTRIES + 1,
      },
      guest: { select: { firstName: true, lastName: true } },
      quote: { select: { checkInDate: true, checkOutDate: true } },
      taxSnapshot: {
        select: {
          customerTaxableAmount: true,
          customerTotalAmount: true,
          ruleVersion: true,
          serviceGstAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_GST_STATEMENTS + 1,
    where: {
      hotelSlug: selected.hotelSlug,
      status: 'confirmed',
      taxSnapshot: { is: { partnerId: input.partnerId } },
    },
  });
  const identity = partner.applications[0];
  const statements = bookings.slice(0, MAX_GST_STATEMENTS).map(presentGstBooking);
  return {
    identity: {
      gstin: partner.taxProfile?.gstin ?? '',
      gstRegistrationStatus: partner.taxProfile?.gstRegistrationStatus ?? 'PENDING',
      legalName: identity?.legalBusinessName || partner.name,
      registeredAddress: identity?.registeredAddress ?? '',
      stateCode: partner.taxProfile?.placeOfSupplyStateCode ?? '',
      taxProfileVerified: partner.taxProfile?.reviewStatus === 'VERIFIED',
    },
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    safetyLimitReached:
      storedProperties.length > MAX_PROPERTIES ||
      bookings.length > MAX_GST_STATEMENTS ||
      bookings.some((booking) => booking.folioEntries.length > MAX_FOLIO_ENTRIES),
    selectedProperty: { id: selected.id, name: selected.displayName },
    statements,
    statutoryIssuanceEnabled: false,
  } as const;
}

export async function getPartnerHotelGstStatement(input: {
  confirmationCode: string;
  memberRole?: string;
  partnerId: string;
}) {
  requireFinanceAccess(input.memberRole);
  const confirmationCode = normalizeHotelBookingReference(input.confirmationCode);
  if (!confirmationCode) return undefined;
  const [properties, partner] = await Promise.all([
    ownedProperties(input.partnerId),
    gstIdentity(input.partnerId),
  ]);
  const hotelSlugs = properties.slice(0, MAX_PROPERTIES).map((property) => property.hotelSlug);
  const booking = await prisma.booking.findFirst({
    include: {
      folioEntries: {
        include: { reversalOf: { select: { entryType: true } } },
        take: MAX_FOLIO_ENTRIES + 1,
      },
      guest: { select: { firstName: true, lastName: true } },
      quote: { select: { checkInDate: true, checkOutDate: true } },
      taxSnapshot: {
        select: {
          customerTaxableAmount: true,
          customerTotalAmount: true,
          ruleVersion: true,
          serviceGstAmount: true,
        },
      },
    },
    where: {
      confirmationCode,
      hotelSlug: { in: hotelSlugs },
      taxSnapshot: { is: { partnerId: input.partnerId } },
    },
  });
  if (!booking || !partner) return undefined;
  const identity = partner.applications[0];
  return {
    identity: {
      gstin: partner.taxProfile?.gstin ?? '',
      gstRegistrationStatus: partner.taxProfile?.gstRegistrationStatus ?? 'PENDING',
      legalName: identity?.legalBusinessName || partner.name,
      registeredAddress: identity?.registeredAddress ?? '',
      stateCode: partner.taxProfile?.placeOfSupplyStateCode ?? '',
      taxProfileVerified: partner.taxProfile?.reviewStatus === 'VERIFIED',
    },
    safetyLimitReached:
      properties.length > MAX_PROPERTIES || booking.folioEntries.length > MAX_FOLIO_ENTRIES,
    statement: presentGstBooking(booking),
    statutoryIssuanceEnabled: false,
  } as const;
}
