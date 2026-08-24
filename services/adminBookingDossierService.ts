import { hotelDocumentPosture, tripDocumentPosture } from './adminDocumentWorkbenchService.ts';
import {
  ADMIN_BOOKING_PRODUCTS,
  type AdminBookingDossier,
  type AdminBookingDossierFact,
  type AdminBookingDossierLinks,
  type AdminBookingProduct,
  type AdminTransportBookingProduct,
} from '../types/adminBookingDossier.ts';

export const ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT = 20;

const REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/;
const TRANSPORT_DETAIL_FIELDS = {
  BUS: [
    ['operatorName', 'Operator'],
    ['origin', 'Origin'],
    ['destination', 'Destination'],
    ['travelDate', 'Travel date'],
    ['seats', 'Seats'],
  ],
  CAR: [
    ['vehicleName', 'Vehicle'],
    ['pickupLocation', 'Pickup location'],
    ['dropoffLocation', 'Drop-off location'],
    ['pickupDate', 'Pickup date'],
    ['pickupTime', 'Pickup time'],
    ['dropoffDate', 'Drop-off date'],
    ['dropoffTime', 'Drop-off time'],
  ],
  FLIGHT: [
    ['airlineName', 'Airline'],
    ['flightNumber', 'Flight'],
    ['departureAirport', 'Departure airport'],
    ['destinationAirport', 'Arrival airport'],
    ['departureDate', 'Departure date'],
    ['endDate', 'Return date'],
  ],
} as const satisfies Record<AdminTransportBookingProduct, readonly (readonly [string, string])[]>;

export function normalizeAdminBookingReference(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return REFERENCE_PATTERN.test(normalized) ? normalized : null;
}

export function isAdminBookingProduct(value: string): value is AdminBookingProduct {
  return ADMIN_BOOKING_PRODUCTS.some((product) => product === value);
}

function safeFactValue(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return normalized || null;
}

export function readAdminTransportDetails(
  product: string,
  serializedDetails: string,
): AdminBookingDossierFact[] {
  if (product !== 'FLIGHT' && product !== 'BUS' && product !== 'CAR') return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedDetails) as unknown;
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const record = parsed as Record<string, unknown>;
  return TRANSPORT_DETAIL_FIELDS[product].flatMap(([field, label]) => {
    const value = safeFactValue(record[field]);
    return value ? [{ label, value }] : [];
  });
}

export function adminBookingDossierLinks(input: {
  confirmationCode: string;
  email: string;
  product: AdminBookingProduct;
  userId: string | null;
}): AdminBookingDossierLinks {
  const reference = encodeURIComponent(input.confirmationCode);
  const customer = input.userId
    ? `/admin/users/${encodeURIComponent(input.userId)}`
    : input.email
      ? `/admin/users?q=${encodeURIComponent(input.email)}`
      : '/admin/users';
  const product = encodeURIComponent(input.product);

  return {
    amendments: input.product === 'HOTEL' ? '/admin#hotel-amendments' : null,
    customer,
    directory: `/admin/bookings?q=${reference}&product=${product}`,
    documents: `/admin/documents?q=${reference}&product=${product}`,
    finance:
      input.product === 'HOTEL'
        ? `/admin/finance?q=${reference}&refundStatus=ALL&window=ALL`
        : null,
    support: `/admin/support?type=CUSTOMER&status=ALL&q=${reference}`,
  };
}

function displayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim() || 'Traveller name unavailable';
}

async function loadHotelDossier(confirmationCode: string): Promise<AdminBookingDossier | null> {
  const { prisma } = await import('../lib/prisma.ts');
  const booking = await prisma.booking.findUnique({
    select: {
      _count: {
        select: { amendments: true, customerSupportCases: true, refunds: true },
      },
      amendments: {
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          requestedCheckInDate: true,
          requestedCheckOutDate: true,
          requestedTotalAmount: true,
          reviewedAt: true,
          status: true,
        },
        take: ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT,
      },
      confirmationCode: true,
      createdAt: true,
      currency: true,
      customerSupportCases: {
        orderBy: { updatedAt: 'desc' },
        select: { caseNumber: true, category: true, status: true, updatedAt: true },
        take: ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT,
      },
      guest: { select: { email: true, firstName: true, lastName: true } },
      hotelSlug: true,
      id: true,
      operationalStatus: true,
      payment: { select: { amount: true, currency: true, status: true } },
      quote: {
        select: { checkInDate: true, checkOutDate: true, nights: true, rooms: true },
      },
      refunds: {
        orderBy: { createdAt: 'desc' },
        select: {
          amount: true,
          createdAt: true,
          currency: true,
          reviewedAt: true,
          status: true,
        },
        take: ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT,
      },
      status: true,
      totalAmount: true,
    },
    where: { confirmationCode },
  });
  if (!booking) return null;

  const [unresolvedAmendment, unresolvedRefund] = await Promise.all([
    prisma.bookingAmendment.findFirst({
      select: { id: true },
      where: { bookingId: booking.id, status: 'PENDING' },
    }),
    prisma.refundRequest.findFirst({
      select: { id: true },
      where: { bookingId: booking.id, status: { in: ['PENDING', 'PROVIDER_FAILED'] } },
    }),
  ]);

  const email = booking.guest?.email ?? '';
  const documents = hotelDocumentPosture({
    amendmentStatuses: unresolvedAmendment ? ['PENDING'] : [],
    bookingCurrency: booking.currency,
    bookingStatus: booking.status,
    bookingTotal: booking.totalAmount,
    paymentAmount: booking.payment?.amount ?? null,
    paymentCurrency: booking.payment?.currency ?? null,
    paymentStatus: booking.payment?.status ?? null,
    refundStatuses: unresolvedRefund ? ['PENDING'] : [],
  });

  return {
    amendments: {
      available: true,
      items: booking.amendments,
      total: booking._count.amendments,
    },
    confirmationCode: booking.confirmationCode,
    createdAt: booking.createdAt,
    currency: booking.currency,
    documents,
    endDate: booking.quote.checkOutDate,
    facts: [
      { label: 'Hotel', value: booking.hotelSlug.replaceAll('-', ' ') },
      { label: 'Rooms', value: String(booking.quote.rooms) },
      { label: 'Nights', value: String(booking.quote.nights) },
    ],
    kind: 'HOTEL',
    links: adminBookingDossierLinks({
      confirmationCode: booking.confirmationCode,
      email,
      product: 'HOTEL',
      userId: null,
    }),
    operationalStatus: booking.operationalStatus,
    product: 'HOTEL',
    refunds: { available: true, items: booking.refunds, total: booking._count.refunds },
    startDate: booking.quote.checkInDate,
    status: booking.status,
    subtitle: `${booking.quote.checkInDate} to ${booking.quote.checkOutDate}`,
    support: {
      items: booking.customerSupportCases,
      total: booking._count.customerSupportCases,
    },
    title: booking.hotelSlug.replaceAll('-', ' '),
    totalAmount: booking.totalAmount,
    traveller: {
      displayName: booking.guest
        ? displayName(booking.guest.firstName, booking.guest.lastName)
        : 'Guest record unavailable',
      email,
      userId: null,
    },
  };
}

async function loadTransportDossier(confirmationCode: string): Promise<AdminBookingDossier | null> {
  const { prisma } = await import('../lib/prisma.ts');
  const trip = await prisma.customerTrip.findUnique({
    select: {
      _count: { select: { supportCases: true } },
      confirmationCode: true,
      createdAt: true,
      currency: true,
      detailsJson: true,
      email: true,
      endDate: true,
      productType: true,
      startDate: true,
      status: true,
      subtitle: true,
      supportCases: {
        orderBy: { updatedAt: 'desc' },
        select: { caseNumber: true, category: true, status: true, updatedAt: true },
        take: ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT,
      },
      title: true,
      totalAmount: true,
      user: { select: { firstName: true, id: true, lastName: true } },
    },
    where: { confirmationCode },
  });
  if (!trip || !isAdminBookingProduct(trip.productType) || trip.productType === 'HOTEL')
    return null;

  return {
    amendments: { available: false, items: [], total: 0 },
    confirmationCode: trip.confirmationCode,
    createdAt: trip.createdAt,
    currency: trip.currency,
    documents: tripDocumentPosture(trip.status),
    endDate: trip.endDate,
    facts: readAdminTransportDetails(trip.productType, trip.detailsJson),
    kind: 'TRANSPORT',
    links: adminBookingDossierLinks({
      confirmationCode: trip.confirmationCode,
      email: trip.email,
      product: trip.productType,
      userId: trip.user?.id ?? null,
    }),
    operationalStatus: null,
    product: trip.productType,
    refunds: { available: false, items: [], total: 0 },
    startDate: trip.startDate,
    status: trip.status,
    subtitle: trip.subtitle,
    support: { items: trip.supportCases, total: trip._count.supportCases },
    title: trip.title,
    totalAmount: trip.totalAmount,
    traveller: {
      displayName: trip.user
        ? displayName(trip.user.firstName, trip.user.lastName)
        : 'Customer account unavailable',
      email: trip.email,
      userId: trip.user?.id ?? null,
    },
  };
}

export async function loadAdminBookingDossier(
  requestedConfirmationCode: string,
): Promise<AdminBookingDossier | null> {
  const confirmationCode = normalizeAdminBookingReference(requestedConfirmationCode);
  if (!confirmationCode) return null;

  return (await loadHotelDossier(confirmationCode)) ?? loadTransportDossier(confirmationCode);
}
