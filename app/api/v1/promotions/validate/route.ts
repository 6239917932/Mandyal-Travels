import { NextResponse } from 'next/server';

import { calculatePromotion, type PromotionProduct } from '@/constants/promotionRules';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import { resolvePromotionRule } from '@/services/promotionService';

const PRODUCT_TYPES = new Set<PromotionProduct>(['FLIGHT', 'HOTEL', 'BUS', 'CAR']);

function isPromotionProduct(value: string): value is PromotionProduct {
  return PRODUCT_TYPES.has(value as PromotionProduct);
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN_ORIGIN', message: 'Use the Mandyal Travels portal.' } },
      { status: 403 },
    );
  }
  const rateLimit = await consumeRateLimit({
    action: 'PROMOTION_VALIDATE',
    identifier: getRequestRateLimitIdentifier(request, 'public'),
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many promotion requests.' } },
      { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
    );
  }

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'The promotion request is invalid.' } },
      { status: 400 },
    );
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const productType =
    typeof body.productType === 'string' ? body.productType.trim().toUpperCase() : '';
  const subtotal = body.subtotal;

  if (
    !code ||
    !isPromotionProduct(productType) ||
    !Number.isInteger(subtotal) ||
    (subtotal as number) <= 0
  ) {
    return NextResponse.json(
      { error: { code: 'INVALID_PROMOTION_REQUEST', message: 'Enter a valid promotion code.' } },
      { status: 400 },
    );
  }

  const rule = await resolvePromotionRule(code, productType);

  if (!rule) {
    return NextResponse.json(
      {
        error: {
          code: 'PROMOTION_NOT_AVAILABLE',
          message: 'This code is not available for this booking.',
        },
      },
      { status: 404 },
    );
  }

  if ((subtotal as number) < rule.minimumSubtotal) {
    return NextResponse.json(
      {
        error: {
          code: 'MINIMUM_SUBTOTAL_NOT_MET',
          message: `This offer requires a minimum booking value of ₹${rule.minimumSubtotal.toLocaleString('en-IN')}.`,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: calculatePromotion(rule, subtotal as number),
  });
}
