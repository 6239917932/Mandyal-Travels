import { normalizeEmail } from '@/lib/auth/validation';
import { createBookingAccessToken, hashBookingAccessToken } from '@/lib/bookingAccessToken';
import { createBookingReference } from '@/lib/confirmationCode';
import { prisma } from '@/lib/prisma';
import { availabilityLockRepository } from '@/repositories/availabilityLockRepository';
import { inventoryOverrideRepository } from '@/repositories/inventoryOverrideRepository';
import { partnerHotelInventoryRepository } from '@/repositories/partnerHotelInventoryRepository';
import { quoteRepository } from '@/repositories/quoteRepository';
import type {
  CreatePartnerDirectBookingRequest,
  CreatedHotelBooking,
  HotelBookingRecord,
  HotelQuote,
  HotelQuoteRequest,
  PartnerDirectBookingOption,
} from '@/types/commerce';

const HOLD_TTL_MILLISECONDS = 10 * 60 * 1_000;

export class PartnerDirectBookingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PartnerDirectBookingError';
  }
}

function nightsBetween(startDate: string, endDate: string) {
  return Math.round(
    (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

function mappedBooking(booking: {
  assignedRoomNumbersJson: string;
  availabilityLockId: string;
  confirmationCode: string;
  createdAt: Date;
  currency: string;
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    specialRequests: string;
  } | null;
  hotelSlug: string;
  id: string;
  operationalStatus: string;
  partnerNote: string;
  payment: { amount: number; status: string } | null;
  quote: { checkInDate: string; checkOutDate: string };
  quoteId: string;
  source: string;
  status: string;
  totalAmount: number;
}): HotelBookingRecord | null {
  if (!booking.guest || !booking.payment) return null;
  let assignedRoomNumbers: string[] = [];
  try {
    const parsed: unknown = JSON.parse(booking.assignedRoomNumbersJson);
    if (Array.isArray(parsed))
      assignedRoomNumbers = parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    assignedRoomNumbers = [];
  }
  return {
    assignedRoomNumbers,
    availabilityLockId: booking.availabilityLockId,
    checkInDate: booking.quote.checkInDate,
    checkOutDate: booking.quote.checkOutDate,
    confirmationCode: booking.confirmationCode,
    createdAt: booking.createdAt.toISOString(),
    currency: booking.currency as HotelBookingRecord['currency'],
    guest: booking.guest,
    hotelSlug: booking.hotelSlug,
    id: booking.id,
    operationalStatus: booking.operationalStatus as HotelBookingRecord['operationalStatus'],
    partnerNote: booking.partnerNote,
    paymentAmount: booking.payment.amount,
    paymentStatus: booking.payment.status as HotelBookingRecord['paymentStatus'],
    quoteId: booking.quoteId,
    source: booking.source as HotelBookingRecord['source'],
    status: booking.status as HotelBookingRecord['status'],
    totalAmount: booking.totalAmount,
  };
}

async function ownedProperty(partnerId: string, hotelSlug: string) {
  return prisma.partnerProperty.findFirst({
    include: {
      rooms: {
        include: { ratePlans: { where: { status: 'ACTIVE' } } },
        where: { status: 'ACTIVE' },
      },
    },
    where: { hotelSlug, listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
}

export async function listPartnerDirectBookingOptions(
  partnerId: string,
): Promise<PartnerDirectBookingOption[]> {
  const properties = await prisma.partnerProperty.findMany({
    include: {
      rooms: {
        include: { ratePlans: { orderBy: { createdAt: 'asc' }, where: { status: 'ACTIVE' } } },
        orderBy: { createdAt: 'asc' },
        where: { status: 'ACTIVE' },
      },
    },
    orderBy: { displayName: 'asc' },
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  return properties.map((property) => ({
    hotelSlug: property.hotelSlug,
    id: property.id,
    name: property.displayName,
    rooms: property.rooms.map((room) => ({
      id: room.id,
      inventoryCount: room.inventoryCount,
      name: room.name,
      ratePlans: (room.ratePlans.length
        ? room.ratePlans
        : [
            {
              id: `fallback-${room.id}`,
              name: room.ratePlanName,
              nightlyRate: room.nightlyRate,
              ratePlanId: `rate-${room.roomTypeId}`,
              taxesAndFees: room.taxesAndFees,
            },
          ]
      ).map((rate) => ({
        id: rate.id,
        name: rate.name,
        nightlyRate: rate.nightlyRate,
        ratePlanId: rate.ratePlanId,
        taxesAndFees: rate.taxesAndFees,
      })),
      roomTypeId: room.roomTypeId,
    })),
  }));
}

export async function createPartnerDirectQuote(
  partnerId: string,
  request: HotelQuoteRequest,
): Promise<HotelQuote> {
  const property = await ownedProperty(partnerId, request.hotelSlug);
  if (!property)
    throw new PartnerDirectBookingError(
      'PROPERTY_NOT_FOUND',
      'Choose an active property assigned to this partner account.',
    );
  const room = property.rooms.find((candidate) => candidate.roomTypeId === request.roomTypeId);
  if (!room) throw new PartnerDirectBookingError('ROOM_NOT_FOUND', 'Choose an active room type.');
  const rate = room.ratePlans.find((candidate) => candidate.ratePlanId === request.ratePlanId);
  const fallbackRate =
    request.ratePlanId === `rate-${room.roomTypeId}`
      ? {
          maximumStayNights: 30,
          minimumStayNights: 1,
          nightlyRate: room.nightlyRate,
          ratePlanId: request.ratePlanId,
          taxesAndFees: room.taxesAndFees,
        }
      : null;
  const selectedRate = rate ?? fallbackRate;
  if (!selectedRate)
    throw new PartnerDirectBookingError('RATE_NOT_FOUND', 'Choose an active rate plan.');

  const nights = nightsBetween(request.checkInDate, request.checkOutDate);
  if (nights < selectedRate.minimumStayNights || nights > selectedRate.maximumStayNights) {
    throw new PartnerDirectBookingError(
      'STAY_RESTRICTION_NOT_MET',
      `This rate accepts stays from ${selectedRate.minimumStayNights} to ${selectedRate.maximumStayNights} nights.`,
    );
  }
  if (
    request.adults > room.maximumAdults * request.rooms ||
    request.children > room.maximumChildren * request.rooms ||
    request.adults + request.children > room.maximumGuests * request.rooms
  ) {
    throw new PartnerDirectBookingError(
      'OCCUPANCY_EXCEEDED',
      'The selected room quantity cannot accommodate these guests.',
    );
  }

  const [locks, overrideLimit, stayControl] = await Promise.all([
    availabilityLockRepository.findReservedByRoomType(
      room.roomTypeId,
      request.checkInDate,
      request.checkOutDate,
    ),
    inventoryOverrideRepository.findLimitForStay(
      room.roomTypeId,
      request.checkInDate,
      request.checkOutDate,
    ),
    partnerHotelInventoryRepository.findStayControl(
      room.roomTypeId,
      request.checkInDate,
      request.checkOutDate,
      selectedRate.nightlyRate,
      selectedRate.ratePlanId,
    ),
  ]);
  if (stayControl.restrictionMessage)
    throw new PartnerDirectBookingError('CALENDAR_RESTRICTION', stayControl.restrictionMessage);
  const reservedRooms = locks.reduce((total, lock) => total + lock.quantity, 0);
  const effectiveInventory = Math.min(
    room.inventoryCount,
    overrideLimit ?? room.inventoryCount,
    stayControl.availableRooms ?? room.inventoryCount,
  );
  if (effectiveInventory - reservedRooms < request.rooms)
    throw new PartnerDirectBookingError(
      'INVENTORY_NOT_AVAILABLE',
      'The requested room quantity is not available for these dates.',
    );

  const roomCharge =
    (stayControl.nightlyCharge ?? selectedRate.nightlyRate * nights) * request.rooms;
  const taxesAndFees = selectedRate.taxesAndFees * nights * request.rooms;
  const availabilityLock = await availabilityLockRepository.create({
    checkInDate: request.checkInDate,
    checkOutDate: request.checkOutDate,
    inventorySource: 'direct',
    quantity: request.rooms,
    roomTypeId: room.roomTypeId,
    ttlMilliseconds: HOLD_TTL_MILLISECONDS,
  });
  const quotedAt = new Date();
  const quote: HotelQuote = {
    availabilityLock,
    checkInDate: request.checkInDate,
    checkOutDate: request.checkOutDate,
    components: [
      {
        amount: roomCharge,
        currency: 'INR',
        label: `${request.rooms} room${request.rooms === 1 ? '' : 's'} × ${nights} night${nights === 1 ? '' : 's'}`,
        type: 'room-charge',
      },
      { amount: taxesAndFees, currency: 'INR', label: 'Taxes and fees', type: 'tax-and-fee' },
    ],
    currency: 'INR',
    expiresAt: availabilityLock.expiresAt,
    hotelSlug: request.hotelSlug,
    id: crypto.randomUUID(),
    nights,
    quotedAt: quotedAt.toISOString(),
    ratePlanId: request.ratePlanId,
    rooms: request.rooms,
    totalAmount: roomCharge + taxesAndFees,
  };
  await quoteRepository.save(quote);
  return quote;
}

export async function confirmPartnerDirectBooking(
  partnerId: string,
  actorUserId: string | undefined,
  request: CreatePartnerDirectBookingRequest,
  idempotencyKey: string,
): Promise<CreatedHotelBooking> {
  const accessToken = createBookingAccessToken(idempotencyKey);
  const existing = await prisma.booking.findUnique({
    include: { guest: true, payment: true, quote: true },
    where: { idempotencyKey },
  });
  if (existing) {
    const property = await ownedProperty(partnerId, existing.hotelSlug);
    const matches =
      property &&
      existing.source === 'PARTNER_DIRECT' &&
      existing.quoteId === request.quoteId &&
      existing.availabilityLockId === request.availabilityLockId &&
      existing.hotelSlug === request.hotelSlug &&
      existing.guest?.email === normalizeEmail(request.guest.email) &&
      existing.guest?.firstName === request.guest.firstName &&
      existing.guest?.lastName === request.guest.lastName &&
      existing.guest?.phone === request.guest.phone &&
      existing.guest?.specialRequests === request.guest.specialRequests;
    const booking = mappedBooking(existing);
    if (!matches || !booking)
      throw new PartnerDirectBookingError(
        'IDEMPOTENCY_KEY_REUSED',
        'This retry key is already connected to different reservation details.',
      );
    return { accessToken, booking };
  }

  const quote = await quoteRepository.findById(request.quoteId);
  if (
    !quote ||
    quote.hotelSlug !== request.hotelSlug ||
    quote.availabilityLock.id !== request.availabilityLockId
  ) {
    throw new PartnerDirectBookingError('QUOTE_NOT_FOUND', 'Review the stay price again.');
  }
  const property = await ownedProperty(partnerId, quote.hotelSlug);
  if (!property)
    throw new PartnerDirectBookingError(
      'PROPERTY_NOT_FOUND',
      'This property is not assigned to you.',
    );
  if (new Date(quote.expiresAt).getTime() <= Date.now())
    throw new PartnerDirectBookingError('QUOTE_EXPIRED', 'The room hold expired. Review it again.');
  const lock = await availabilityLockRepository.findById(request.availabilityLockId);
  if (!lock || lock.status !== 'active')
    throw new PartnerDirectBookingError('LOCK_NOT_ACTIVE', 'The room hold is no longer active.');
  const converted = await availabilityLockRepository.convert(lock.id);
  if (!converted)
    throw new PartnerDirectBookingError(
      'LOCK_CONVERSION_FAILED',
      'The room could not be reserved.',
    );

  const bookingId = crypto.randomUUID();
  const confirmationCode = createBookingReference('MT');
  try {
    const created = await prisma.$transaction(async (transaction) => {
      const booking = await transaction.booking.create({
        data: {
          accessTokenHash: hashBookingAccessToken(accessToken),
          availabilityLockId: converted.id,
          confirmationCode,
          currency: quote.currency,
          guest: { create: { ...request.guest, email: normalizeEmail(request.guest.email) } },
          hotelSlug: quote.hotelSlug,
          id: bookingId,
          idempotencyKey,
          payment: {
            create: {
              amount: quote.totalAmount,
              currency: quote.currency,
              environment: 'LIVE',
              provider: 'PAY_AT_PROPERTY',
              providerRef: `pay-at-property-${bookingId}`,
              reconciliationNote:
                'Payment is due at the property and has not been captured by Mandyal Travels.',
              reconciliationStatus: 'UNRECONCILED',
              status: 'pending',
            },
          },
          quoteId: quote.id,
          source: 'PARTNER_DIRECT',
          status: 'confirmed',
          totalAmount: quote.totalAmount,
        },
        include: { guest: true, payment: true, quote: true },
      });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'DIRECT_BOOKING_CREATED',
          actorUserId,
          entityId: booking.id,
          entityType: 'HOTEL_BOOKING',
          metadataJson: JSON.stringify({
            confirmationCode,
            hotelSlug: quote.hotelSlug,
            paymentArrangement: 'PAY_AT_PROPERTY',
            totalAmount: quote.totalAmount,
          }),
          partnerId,
          summary: `Direct reservation ${confirmationCode} created with payment due at property.`,
        },
      });
      return booking;
    });
    const booking = mappedBooking(created);
    if (!booking) throw new Error('Direct booking projection could not be created.');
    return { accessToken, booking };
  } catch (error) {
    await availabilityLockRepository.release(converted.id);
    throw error;
  }
}
