import { NextResponse } from 'next/server';

import { promotionRules, type PromotionProduct } from '@/constants/promotionRules';

const PRODUCT_TYPES = new Set<PromotionProduct>(['FLIGHT', 'HOTEL', 'BUS', 'CAR']);

function isPromotionProduct(value: string): value is PromotionProduct {
  return PRODUCT_TYPES.has(value as PromotionProduct);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'The promotion request is invalid.' } },
      { status: 400 },
    );
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const productType =
    typeof body.productType === 'string' ? body.productType.trim().toUpperCase() : '';
  const subtotal = body.subtotal;

  if (!code || !isPromotionProduct(productType) || !Number.isInteger(subtotal) || (subtotal as number) <= 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_PROMOTION_REQUEST', message: 'Enter a valid promotion code.' } },
      { status: 400 },
    );
  }

  const rule = promotionRules.find((candidate) => candidate.active && candidate.code === code);

  if (!rule || !rule.products.includes(productType)) {
    return NextResponse.json(
      { error: { code: 'PROMOTION_NOT_AVAILABLE', message: 'This code is not available for this booking.' } },
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

  const discountAmount = Math.min(
    Math.floor(((subtotal as number) * rule.percentOff) / 100),
    rule.maxDiscount,
  );
  const finalTotal = (subtotal as number) - discountAmount;

  return NextResponse.json({
    data: {
      code: rule.code,
      discountAmount,
      finalTotal,
      percentOff: rule.percentOff,
      ruleVersion: rule.version,
    },
  });
}
