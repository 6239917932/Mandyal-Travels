import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { readJsonObject } from '@/lib/api/request';
import { hasValidFlightPassengerDetails } from '@/lib/flight/bookingRules';
import { hasValidCarBookingParty } from '@/lib/car/bookingRules';
import { hasValidBusPassengerDetails, parseBusSeats } from '@/lib/bus/bookingRules';
import { prisma } from '@/lib/prisma';
import {
  BusinessCheckoutError,
  revalidateTravelSelection,
  validateBusinessCheckout,
} from '@/services/businessCheckoutService';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';
import { flightSearchCriteriaToQuery } from '@/utils/flightSearchCriteria';
import { createBusSearchCriteria, busSearchCriteriaToQuery } from '@/utils/busSearchCriteria';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
import { BUSINESS_AUDIT_ACTIONS, createBusinessAuditData } from '@/services/businessAuditService';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import {
  customerOwnsTrip,
  createCustomerTripDetailsJson,
  customerTripContextsMatch,
  customerTripResponse,
  isCustomerTripProduct,
  normalizeCustomerTripReference,
  type CustomerTripImmutableContext,
  type CustomerTripOwner,
  type CustomerTripOwnershipRecord,
  type CustomerTripResponse,
} from '@/services/customerTripPersistenceRules';

const MAX_DETAILS_LENGTH = 32_000;
const MAX_TRIP_AMOUNT = 100_000_000;
const CUSTOMER_TRIP_CREATE_LIMIT = 10;
const CUSTOMER_TRIP_CREATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_PROMOTION_CODE_LENGTH = 64;

const CUSTOMER_TRIP_INTEGRITY_SELECT = {
  businessTravelRequestId: true,
  confirmationCode: true,
  currency: true,
  detailsJson: true,
  email: true,
  endDate: true,
  productType: true,
  startDate: true,
  status: true,
  subtitle: true,
  title: true,
  totalAmount: true,
  userId: true,
} as const;

type CustomerTripIntegrityRecord = CustomerTripImmutableContext & CustomerTripOwnershipRecord;

class CustomerTripPersistenceError extends Error {
  constructor(
    readonly code: 'CONFIRMATION_ALREADY_USED' | 'CONFIRMATION_CONTEXT_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'CustomerTripPersistenceError';
  }
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function readCarOfferId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const offerId = (value as Record<string, unknown>).offerId;
  return isText(offerId) && offerId.length <= 160 ? offerId.trim() : undefined;
}

function readOfferId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const offerId = (value as Record<string, unknown>).offerId;
  return isText(offerId) && offerId.length <= 200 ? offerId.trim() : undefined;
}

function readCustomerName(details: Record<string, unknown>, fallback: string): string {
  const party = details.driver ?? details.traveller;
  if (!party || typeof party !== 'object' || Array.isArray(party)) return fallback;
  const record = party as Record<string, unknown>;
  const firstName = isText(record.firstName) ? record.firstName.trim() : '';
  const lastName = isText(record.lastName) ? record.lastName.trim() : '';
  return `${firstName} ${lastName}`.trim() || fallback;
}

function carCriteriaQuery(criteria: ReturnType<typeof createCarSearchCriteria>) {
  return {
    drivers: String(criteria.drivers),
    dropoffDate: criteria.dropoffDate,
    dropoffLocation: criteria.dropoffLocation,
    dropoffTime: criteria.dropoffTime,
    pickupDate: criteria.pickupDate,
    pickupLocation: criteria.pickupLocation,
    pickupTime: criteria.pickupTime,
    rentalMode: criteria.rentalMode,
  };
}

function resolveExistingTrip(
  existing: CustomerTripIntegrityRecord | null,
  requested: CustomerTripImmutableContext,
  owner: CustomerTripOwner,
): CustomerTripResponse | undefined {
  if (!existing) return undefined;
  if (!customerOwnsTrip(existing, owner)) {
    throw new CustomerTripPersistenceError(
      'CONFIRMATION_ALREADY_USED',
      'This booking reference is already connected to another account.',
    );
  }
  if (!customerTripContextsMatch(existing, requested)) {
    throw new CustomerTripPersistenceError(
      'CONFIRMATION_CONTEXT_MISMATCH',
      'This booking reference is already connected to different immutable booking details.',
    );
  }
  const response = customerTripResponse(existing);
  if (!response) {
    throw new CustomerTripPersistenceError(
      'CONFIRMATION_CONTEXT_MISMATCH',
      'This booking reference is connected to a booking record that requires support review.',
    );
  }
  return response;
}

async function lookupExistingTrip(
  confirmationCode: string,
  requested: CustomerTripImmutableContext,
  owner: CustomerTripOwner,
): Promise<CustomerTripResponse | undefined> {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.customerTrip.findUnique({
      select: CUSTOMER_TRIP_INTEGRITY_SELECT,
      where: { confirmationCode },
    });
    return resolveExistingTrip(existing, requested, owner);
  });
}

function persistenceErrorResponse(error: CustomerTripPersistenceError) {
  return errorResponse(error.code, error.message, 409);
}

async function concurrentTripResponse(
  confirmationCode: string,
  requested: CustomerTripImmutableContext,
  owner: CustomerTripOwner,
) {
  try {
    const trip = await lookupExistingTrip(confirmationCode, requested, owner);
    return trip ? NextResponse.json({ data: trip }) : undefined;
  } catch (error) {
    return error instanceof CustomerTripPersistenceError
      ? persistenceErrorResponse(error)
      : undefined;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse('AUTH_REQUIRED', 'Sign in to save this trip.', 401);

  const body = await readJsonObject(request);
  if (!body) {
    return errorResponse('INVALID_JSON', 'The request body is invalid.', 400);
  }

  const productType = isText(body.productType) ? body.productType.toUpperCase() : '';
  const reference = normalizeCustomerTripReference(
    isText(body.confirmationCode) ? body.confirmationCode : '',
  );
  const confirmationCode = reference?.confirmationCode ?? '';
  const title = isText(body.title) ? body.title.trim() : '';
  const subtitle = isText(body.subtitle) ? body.subtitle.trim() : '';
  const startDate = isText(body.startDate) ? body.startDate.trim() : '';
  const endDate = body.endDate == null ? null : isText(body.endDate) ? body.endDate.trim() : '';
  const totalAmount = body.totalAmount;
  const businessTravelRequestId = isText(body.businessTravelRequestId)
    ? body.businessTravelRequestId.trim()
    : undefined;
  const details =
    body.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? body.details
      : {};
  const promotionCode = isText(body.promotionCode)
    ? body.promotionCode.trim().toUpperCase()
    : undefined;
  const carOfferId = productType === 'CAR' ? readCarOfferId(body.businessSelection) : undefined;
  const busOfferId = productType === 'BUS' ? readOfferId(body.businessSelection) : undefined;
  const carRentalMode =
    productType === 'CAR' &&
    body.businessSelection &&
    typeof body.businessSelection === 'object' &&
    !Array.isArray(body.businessSelection) &&
    (body.businessSelection as Record<string, unknown>).rentalMode === 'chauffeur'
      ? 'chauffeur'
      : 'self-drive';
  const flightAdults =
    productType === 'FLIGHT'
      ? createFlightSearchCriteria(
          body.businessSelection &&
            typeof body.businessSelection === 'object' &&
            !Array.isArray(body.businessSelection)
            ? Object.fromEntries(
                Object.entries(body.businessSelection).filter(
                  (entry): entry is [string, string] => typeof entry[1] === 'string',
                ),
              )
            : {},
        ).adults
      : undefined;
  const selectionValues =
    body.businessSelection &&
    typeof body.businessSelection === 'object' &&
    !Array.isArray(body.businessSelection)
      ? Object.fromEntries(
          Object.entries(body.businessSelection).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {};
  const flightCriteria =
    productType === 'FLIGHT' ? createFlightSearchCriteria(selectionValues) : null;
  const busCriteria = productType === 'BUS' ? createBusSearchCriteria(selectionValues) : null;
  const carCriteria = productType === 'CAR' ? createCarSearchCriteria(selectionValues) : null;
  const busPassengers =
    productType === 'BUS' && body.businessSelection && typeof body.businessSelection === 'object'
      ? Number((body.businessSelection as Record<string, unknown>).passengers)
      : undefined;
  const busSeats =
    productType === 'BUS' && body.businessSelection && typeof body.businessSelection === 'object'
      ? (body.businessSelection as Record<string, unknown>).seats
      : undefined;
  const parsedBusSeats =
    productType === 'BUS' && busPassengers !== undefined
      ? parseBusSeats(busSeats, busPassengers)
      : undefined;
  const canonicalSelection =
    productType === 'FLIGHT' && flightCriteria
      ? {
          offerId: readOfferId(body.businessSelection) ?? null,
          promotionCode: promotionCode ?? null,
          search: flightSearchCriteriaToQuery(flightCriteria),
        }
      : productType === 'BUS' && busCriteria
        ? {
            offerId: busOfferId ?? null,
            promotionCode: promotionCode ?? null,
            search: busSearchCriteriaToQuery(busCriteria),
            seats: parsedBusSeats ?? [],
          }
        : productType === 'CAR' && carCriteria
          ? {
              offerId: carOfferId ?? null,
              promotionCode: promotionCode ?? null,
              search: carCriteriaQuery(carCriteria),
            }
          : null;
  const detailsJson = canonicalSelection
    ? createCustomerTripDetailsJson(details as Record<string, unknown>, canonicalSelection)
    : undefined;

  if (
    !isCustomerTripProduct(productType) ||
    !reference ||
    reference.productType !== productType ||
    title.length < 1 ||
    title.length > 160 ||
    subtitle.length < 1 ||
    subtitle.length > 200 ||
    !isIsoDate(startDate) ||
    (endDate !== null && (!isIsoDate(endDate) || endDate < startDate)) ||
    !Number.isInteger(totalAmount) ||
    (totalAmount as number) < 0 ||
    (totalAmount as number) > MAX_TRIP_AMOUNT ||
    !detailsJson ||
    detailsJson.length > MAX_DETAILS_LENGTH ||
    (promotionCode !== undefined && promotionCode.length > MAX_PROMOTION_CODE_LENGTH) ||
    (businessTravelRequestId !== undefined && businessTravelRequestId.length > 200)
  ) {
    return errorResponse('INVALID_TRIP', 'The trip details are invalid or too large.', 400);
  }
  if (
    productType === 'FLIGHT' &&
    (flightAdults === undefined || !hasValidFlightPassengerDetails(details, flightAdults))
  ) {
    return errorResponse(
      'INVALID_FLIGHT_PASSENGERS',
      'Complete passenger names and booking contact details are required.',
      400,
    );
  }
  if (productType === 'CAR' && !hasValidCarBookingParty(details, carRentalMode)) {
    return errorResponse(
      'INVALID_CAR_DRIVER',
      carRentalMode === 'chauffeur'
        ? 'Complete lead-traveller and booking-contact details are required.'
        : 'Complete and valid primary-driver and booking-contact details are required.',
      400,
    );
  }
  if (
    productType === 'BUS' &&
    (busPassengers === undefined ||
      !hasValidBusPassengerDetails(details, busPassengers) ||
      !parsedBusSeats)
  ) {
    return errorResponse(
      'INVALID_BUS_TRAVELERS',
      'Complete passenger, contact, and unique seat details are required.',
      400,
    );
  }

  const tripData = {
    currency: 'INR',
    detailsJson,
    email: user.email,
    endDate,
    productType,
    startDate,
    status: 'CONFIRMED',
    subtitle,
    title,
    totalAmount: totalAmount as number,
    userId: user.id,
  };
  const immutableContext: CustomerTripImmutableContext = {
    businessTravelRequestId,
    confirmationCode,
    currency: tripData.currency,
    detailsJson,
    endDate,
    productType,
    startDate,
    status: tripData.status,
    subtitle,
    title,
    totalAmount: totalAmount as number,
  };
  const owner = { email: user.email, userId: user.id } satisfies CustomerTripOwner;

  try {
    const existingTrip = await lookupExistingTrip(confirmationCode, immutableContext, owner);
    if (existingTrip) return NextResponse.json({ data: existingTrip });
  } catch (error) {
    if (error instanceof CustomerTripPersistenceError) return persistenceErrorResponse(error);
    console.error('Trip history lookup failed.', error);
    return errorResponse('TRIP_LOOKUP_FAILED', 'The booking could not be checked.', 500);
  }

  try {
    const rateLimit = await consumeRateLimit({
      action: 'CUSTOMER_TRIP_CREATE',
      identifier: getRequestRateLimitIdentifier(request, user.id),
      limit: CUSTOMER_TRIP_CREATE_LIMIT,
      windowMs: CUSTOMER_TRIP_CREATE_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'TRIP_CREATE_RATE_LIMITED',
            message: 'Too many booking creation attempts. Please wait before trying again.',
          },
        },
        { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
      );
    }
  } catch (error) {
    console.error('Trip creation rate-limit check failed.', error);
    return errorResponse(
      'TRIP_CREATE_CHECK_FAILED',
      'The booking could not be checked safely. Please try again.',
      500,
    );
  }

  let businessCheckout: Awaited<ReturnType<typeof validateBusinessCheckout>> | undefined;
  if (businessTravelRequestId) {
    try {
      businessCheckout = await validateBusinessCheckout({
        productType,
        promotionCode,
        requestId: businessTravelRequestId,
        selection: body.businessSelection,
        userId: user.id,
      });
    } catch (error) {
      const completedRetry = await concurrentTripResponse(
        confirmationCode,
        immutableContext,
        owner,
      );
      if (completedRetry) return completedRetry;
      if (error instanceof BusinessCheckoutError) {
        return errorResponse(error.code, error.message, error.status);
      }
      console.error('Business checkout validation failed.', error);
      return errorResponse(
        'BUSINESS_CHECKOUT_FAILED',
        'The company approval could not be checked. No payment has been captured.',
        500,
      );
    }

    if (businessCheckout.finalTotal !== totalAmount) {
      const completedRetry = await concurrentTripResponse(
        confirmationCode,
        immutableContext,
        owner,
      );
      if (completedRetry) return completedRetry;
      return errorResponse(
        'BUSINESS_TOTAL_MISMATCH',
        'The company booking total changed. Please review the fare again.',
        409,
      );
    }
  } else {
    try {
      const validatedSelection = await revalidateTravelSelection(
        productType,
        body.businessSelection,
        promotionCode,
      );
      if (
        validatedSelection.startDate !== startDate ||
        validatedSelection.endDate !== endDate ||
        validatedSelection.finalTotal !== totalAmount
      ) {
        const completedRetry = await concurrentTripResponse(
          confirmationCode,
          immutableContext,
          owner,
        );
        if (completedRetry) return completedRetry;
        return errorResponse(
          'TRIP_SELECTION_CHANGED',
          'The selected itinerary or total changed. Please review it again before payment.',
          409,
        );
      }
    } catch (error) {
      const completedRetry = await concurrentTripResponse(
        confirmationCode,
        immutableContext,
        owner,
      );
      if (completedRetry) return completedRetry;
      if (error instanceof BusinessCheckoutError) {
        return errorResponse('TRIP_SELECTION_UNAVAILABLE', error.message, error.status);
      }
      console.error('Personal checkout validation failed.', error);
      return errorResponse(
        'TRIP_SELECTION_CHECK_FAILED',
        'The selected itinerary could not be checked. No payment has been captured.',
        500,
      );
    }
  }

  try {
    if (!businessCheckout) {
      const result = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.customerTrip.findUnique({
          select: CUSTOMER_TRIP_INTEGRITY_SELECT,
          where: { confirmationCode },
        });
        const existingResponse = resolveExistingTrip(existing, immutableContext, owner);
        if (existingResponse) return { created: false, trip: existingResponse };

        const createdTrip = await transaction.customerTrip.create({
          data: { confirmationCode, ...tripData },
        });
        if (carOfferId?.startsWith('direct-')) {
          await partnerOperationsService.reserveDirectVehicle(transaction, {
            confirmationCode,
            customerEmail: user.email,
            customerName: readCustomerName(details as Record<string, unknown>, user.firstName),
            customerTripId: createdTrip.id,
            dropoffDate: endDate ?? startDate,
            offerId: carOfferId,
            pickupDate: startDate,
            totalAmount: totalAmount as number,
          });
        }
        if (busOfferId?.startsWith('direct-bus-trip-') && parsedBusSeats && busPassengers) {
          await partnerOperationsService.reserveDirectBus(transaction, {
            confirmationCode,
            customerEmail: user.email,
            customerName: readCustomerName(details as Record<string, unknown>, user.firstName),
            customerTripId: createdTrip.id,
            offerId: busOfferId,
            passengerCount: busPassengers,
            seats: parsedBusSeats,
            serviceDate: startDate,
            totalAmount: totalAmount as number,
          });
        }
        const response = customerTripResponse(createdTrip);
        if (!response) throw new Error('Created trip failed its public response contract.');
        return { created: true, trip: response };
      });
      return NextResponse.json({ data: result.trip }, { status: result.created ? 201 : 200 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.customerTrip.findUnique({
        select: CUSTOMER_TRIP_INTEGRITY_SELECT,
        where: { confirmationCode },
      });
      const existingResponse = resolveExistingTrip(existing, immutableContext, owner);
      if (existingResponse) return { created: false, trip: existingResponse };

      const completed = await transaction.businessTravelRequest.updateMany({
        data: {
          bookedAt: new Date(),
          bookingTotalAmount: totalAmount as number,
          status: 'BOOKED',
        },
        where: { id: businessCheckout.requestId, requesterId: user.id, status: 'APPROVED' },
      });
      if (completed.count !== 1) {
        throw new BusinessCheckoutError(
          'BUSINESS_REQUEST_ALREADY_USED',
          'This company request is no longer available for booking.',
        );
      }

      const data = { ...tripData, businessTravelRequestId: businessCheckout.requestId };
      const completedTrip = await transaction.customerTrip.create({
        data: { confirmationCode, ...data },
      });
      if (carOfferId?.startsWith('direct-')) {
        await partnerOperationsService.reserveDirectVehicle(transaction, {
          confirmationCode,
          customerEmail: user.email,
          customerName: readCustomerName(details as Record<string, unknown>, user.firstName),
          customerTripId: completedTrip.id,
          dropoffDate: endDate ?? startDate,
          offerId: carOfferId,
          pickupDate: startDate,
          totalAmount: totalAmount as number,
        });
      }
      if (busOfferId?.startsWith('direct-bus-trip-') && parsedBusSeats && busPassengers) {
        await partnerOperationsService.reserveDirectBus(transaction, {
          confirmationCode,
          customerEmail: user.email,
          customerName: readCustomerName(details as Record<string, unknown>, user.firstName),
          customerTripId: completedTrip.id,
          offerId: busOfferId,
          passengerCount: busPassengers,
          seats: parsedBusSeats,
          serviceDate: startDate,
          totalAmount: totalAmount as number,
        });
      }
      await transaction.businessAuditLog.create({
        data: createBusinessAuditData({
          action: BUSINESS_AUDIT_ACTIONS.TRAVEL_BOOKED,
          actorUserId: user.id,
          entityId: businessCheckout.requestId,
          entityType: 'TRAVEL_REQUEST',
          metadata: { confirmationCode, productType, totalAmount: totalAmount as number },
          organizationId: businessCheckout.organizationId,
          summary: `${productType.toLowerCase()} company travel booked.`,
        }),
      });
      const response = customerTripResponse(completedTrip);
      if (!response) throw new Error('Created trip failed its public response contract.');
      return { created: true, trip: response };
    });

    return NextResponse.json({ data: result.trip }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof CustomerTripPersistenceError) return persistenceErrorResponse(error);
    const completedRetry = await concurrentTripResponse(confirmationCode, immutableContext, owner);
    if (completedRetry) return completedRetry;
    if (error instanceof PartnerOperationsError) {
      return errorResponse(error.code, error.message, 409);
    }
    if (error instanceof BusinessCheckoutError) {
      return errorResponse(error.code, error.message, error.status);
    }
    console.error('Trip history creation failed.', error);
    return errorResponse('TRIP_SAVE_FAILED', 'The booking could not be completed.', 500);
  }
}
