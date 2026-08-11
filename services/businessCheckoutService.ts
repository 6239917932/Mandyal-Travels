import {
  calculatePromotion,
  findPromotionRule,
  type PromotionProduct,
} from '@/constants/promotionRules';
import { prisma } from '@/lib/prisma';
import { quoteRepository } from '@/repositories/quoteRepository';
import { busService } from '@/services/busService';
import { carService } from '@/services/carService';
import { flightService } from '@/services/flightService';
import { createBusSearchCriteria } from '@/utils/busSearchCriteria';
import { createCarSearchCriteria } from '@/utils/carSearchCriteria';
import { createFlightSearchCriteria } from '@/utils/flightSearchCriteria';

type CheckoutProduct = PromotionProduct;
const POLICY_CABIN_CLASSES = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);

export class BusinessCheckoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = 'BusinessCheckoutError';
  }
}

function toSearchParams(selection: unknown): Record<string, string> {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new BusinessCheckoutError(
      'BUSINESS_SELECTION_REQUIRED',
      'The selected travel details are missing. Please choose the trip again.',
      400,
    );
  }

  return Object.fromEntries(
    Object.entries(selection).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function requiredText(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  if (!value) {
    throw new BusinessCheckoutError(
      'BUSINESS_SELECTION_INCOMPLETE',
      'The selected travel details are incomplete. Please choose the trip again.',
      400,
    );
  }
  return value;
}

function applyPromotion(productType: CheckoutProduct, subtotal: number, promotionCode?: string) {
  if (!promotionCode) return subtotal;

  const rule = findPromotionRule(promotionCode, productType);
  if (!rule || subtotal < rule.minimumSubtotal) {
    throw new BusinessCheckoutError(
      'BUSINESS_PROMOTION_INVALID',
      'The selected promotion is no longer valid. Please validate it again.',
    );
  }
  return calculatePromotion(rule, subtotal).finalTotal;
}

function readApprovedCabin(policySnapshotJson: string) {
  try {
    const snapshot = JSON.parse(policySnapshotJson) as { defaultCabinClass?: unknown };
    const cabin =
      typeof snapshot.defaultCabinClass === 'string'
        ? snapshot.defaultCabinClass.toUpperCase()
        : '';
    if (POLICY_CABIN_CLASSES.has(cabin)) return cabin;
  } catch {
    // Invalid snapshots fail closed below rather than using a newer organization policy.
  }

  throw new BusinessCheckoutError(
    'BUSINESS_POLICY_SNAPSHOT_INVALID',
    'The saved approval policy could not be verified. Ask a company administrator to create a new request.',
  );
}

async function revalidateSelection(
  productType: CheckoutProduct,
  selection: unknown,
  promotionCode?: string,
) {
  const values = toSearchParams(selection);

  if (productType === 'FLIGHT') {
    [
      'adults',
      'cabinClass',
      'departureDate',
      'destination',
      'offerId',
      'origin',
      'tripType',
    ].forEach((key) => requiredText(values, key));
    const criteria = createFlightSearchCriteria(values);
    const offer = await flightService.revalidateOffer(values.offerId, criteria);
    if (!offer) {
      throw new BusinessCheckoutError(
        'BUSINESS_OFFER_UNAVAILABLE',
        'The approved flight offer is no longer available. Please choose another flight.',
      );
    }
    return {
      endDate: criteria.returnDate ?? null,
      finalTotal: applyPromotion(productType, offer.totalPrice, promotionCode),
      policyCabin: criteria.cabinClass.replaceAll('-', '_').toUpperCase(),
      startDate: criteria.departureDate,
    };
  }

  if (productType === 'BUS') {
    ['destination', 'offerId', 'origin', 'passengers', 'travelDate'].forEach((key) =>
      requiredText(values, key),
    );
    const criteria = createBusSearchCriteria(values);
    const offer = await busService.revalidateOffer(values.offerId, criteria);
    if (!offer) {
      throw new BusinessCheckoutError(
        'BUSINESS_OFFER_UNAVAILABLE',
        'The approved bus offer is no longer available. Please choose another bus.',
      );
    }
    return {
      endDate: null,
      finalTotal: applyPromotion(productType, offer.totalPrice, promotionCode),
      policyCabin: null,
      startDate: criteria.travelDate,
    };
  }

  if (productType === 'CAR') {
    [
      'drivers',
      'dropoffDate',
      'dropoffLocation',
      'offerId',
      'pickupDate',
      'pickupLocation',
    ].forEach((key) => requiredText(values, key));
    const criteria = createCarSearchCriteria(values);
    const offer = await carService.revalidateOffer(values.offerId, criteria);
    if (!offer) {
      throw new BusinessCheckoutError(
        'BUSINESS_OFFER_UNAVAILABLE',
        'The approved car offer is no longer available. Please choose another car.',
      );
    }
    return {
      endDate: criteria.dropoffDate,
      finalTotal: applyPromotion(productType, offer.totalPrice, promotionCode),
      policyCabin: null,
      startDate: criteria.pickupDate,
    };
  }

  const quoteId = requiredText(values, 'quoteId');
  const quote = await quoteRepository.findById(quoteId);
  if (!quote || new Date(quote.expiresAt) <= new Date()) {
    throw new BusinessCheckoutError(
      'BUSINESS_QUOTE_UNAVAILABLE',
      'The approved hotel quote has expired. Please choose the room again.',
    );
  }
  return {
    endDate: quote.checkOutDate,
    finalTotal: applyPromotion(productType, quote.totalAmount, promotionCode),
    policyCabin: null,
    startDate: quote.checkInDate,
  };
}

export async function validateBusinessCheckout({
  productType,
  promotionCode,
  requestId,
  selection,
  userId,
}: {
  productType: CheckoutProduct;
  promotionCode?: string;
  requestId: string;
  selection: unknown;
  userId: string;
}) {
  const travelRequest = await prisma.businessTravelRequest.findFirst({
    include: { organization: true },
    where: { id: requestId, requesterId: userId },
  });

  if (!travelRequest) {
    throw new BusinessCheckoutError(
      'BUSINESS_REQUEST_NOT_FOUND',
      'This company travel request is not available for your account.',
      404,
    );
  }
  if (travelRequest.productType !== productType) {
    throw new BusinessCheckoutError(
      'BUSINESS_PRODUCT_MISMATCH',
      `This approval is for ${travelRequest.productType.toLowerCase()} travel, not ${productType.toLowerCase()} travel.`,
    );
  }
  if (travelRequest.status !== 'APPROVED') {
    const message =
      travelRequest.status === 'PENDING'
        ? 'Administrator approval is still pending. No payment has been captured.'
        : travelRequest.status === 'REJECTED'
          ? 'This company travel request was rejected. No payment has been captured.'
          : 'This company travel request has already been used for a booking.';
    throw new BusinessCheckoutError('BUSINESS_REQUEST_NOT_APPROVED', message);
  }

  const selectionResult = await revalidateSelection(productType, selection, promotionCode);
  if (selectionResult.startDate !== travelRequest.startDate) {
    throw new BusinessCheckoutError(
      'BUSINESS_DATE_MISMATCH',
      'The selected start date does not match the approved company request.',
    );
  }
  if (selectionResult.endDate !== travelRequest.endDate) {
    throw new BusinessCheckoutError(
      'BUSINESS_DATE_MISMATCH',
      'The selected end date does not match the approved company request.',
    );
  }
  if (selectionResult.finalTotal > travelRequest.estimatedAmount) {
    throw new BusinessCheckoutError(
      'BUSINESS_AMOUNT_EXCEEDED',
      'The selected total is higher than the approved amount. Submit a revised company request before payment.',
    );
  }

  if (selectionResult.policyCabin) {
    const approvedCabin = readApprovedCabin(travelRequest.policySnapshotJson);
    if (selectionResult.policyCabin !== approvedCabin) {
      throw new BusinessCheckoutError(
        'BUSINESS_CABIN_MISMATCH',
        `The selected cabin does not match the approved ${approvedCabin.toLowerCase()} cabin policy.`,
      );
    }
  }

  return {
    finalTotal: selectionResult.finalTotal,
    organizationId: travelRequest.organizationId,
    organizationName: travelRequest.organization.name,
    requestId: travelRequest.id,
  };
}
