import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function GET() {
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const coupons = await prisma.partnerOnboardingCoupon.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      active: true,
      code: true,
      createdAt: true,
      description: true,
      endsAt: true,
      id: true,
      startsAt: true,
      usageCount: true,
      usageLimit: true,
      version: true,
      waiverPercent: true,
    },
    take: 100,
  });
  return Response.json({ data: coupons });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels admin portal.', 403);
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request);
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const startsAt =
    typeof body?.startsAt === 'string' ? new Date(body.startsAt) : new Date('invalid');
  const endsAt = typeof body?.endsAt === 'string' ? new Date(body.endsAt) : new Date('invalid');
  const usageLimit = body?.usageLimit === null ? null : Number(body?.usageLimit);
  if (
    !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code) ||
    description.length < 5 ||
    description.length > 200 ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt ||
    (usageLimit !== null &&
      (!Number.isSafeInteger(usageLimit) || usageLimit < 1 || usageLimit > 10_000)) ||
    body?.waiverPercent !== 100 ||
    typeof body?.active !== 'boolean'
  ) {
    return failure(
      'INVALID_COUPON',
      'Create a bounded, dated 100% launch waiver coupon with a valid usage limit.',
      400,
    );
  }
  try {
    const coupon = await prisma.partnerOnboardingCoupon.create({
      data: {
        active: body.active,
        code,
        createdByUserId: admin.id,
        description,
        endsAt,
        startsAt,
        usageLimit,
        waiverPercent: 100,
      },
    });
    return Response.json({ data: coupon }, { status: 201 });
  } catch (error) {
    return hasPrismaErrorCode(error, 'P2002')
      ? failure('COUPON_EXISTS', 'This launch coupon already exists.', 409)
      : failure('COUPON_CREATE_FAILED', 'The launch coupon could not be created.', 500);
  }
}
