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
    body?.active !== false
  ) {
    return failure(
      'INVALID_COUPON',
      'Create a bounded, dated 100% launch waiver coupon with a valid usage limit.',
      400,
    );
  }
  try {
    const coupon = await prisma.$transaction(async (transaction) => {
      const created = await transaction.partnerOnboardingCoupon.create({
        data: {
          active: false,
          code,
          createdByUserId: admin.id,
          description,
          endsAt,
          startsAt,
          usageLimit,
          waiverPercent: 100,
        },
      });
      await transaction.partnerOnboardingCouponEvent.create({
        data: {
          action: 'CREATED_PAUSED',
          actorUserId: admin.id,
          couponId: created.id,
          fromActive: false,
          reason: description,
          toActive: false,
          version: created.version,
        },
      });
      return created;
    });
    return Response.json({ data: coupon }, { status: 201 });
  } catch (error) {
    return hasPrismaErrorCode(error, 'P2002')
      ? failure('COUPON_EXISTS', 'This launch coupon already exists.', 409)
      : failure('COUPON_CREATE_FAILED', 'The launch coupon could not be created.', 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels admin portal.', 403);
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request, 2048);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  const expectedVersion = Number(body?.expectedVersion);
  const active = typeof body?.active === 'boolean' ? body.active : null;
  if (
    !id ||
    active === null ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return failure(
      'INVALID_COUPON_UPDATE',
      'Choose a coupon state, its current version, and a reason between 10 and 500 characters.',
      400,
    );
  }
  try {
    const coupon = await prisma.$transaction(async (transaction) => {
      const current = await transaction.partnerOnboardingCoupon.findUnique({
        select: {
          active: true,
          code: true,
          endsAt: true,
          id: true,
          usageCount: true,
          usageLimit: true,
          version: true,
        },
        where: { id },
      });
      if (!current) throw new Error('NOT_FOUND');
      if (current.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
      if (current.active === active) throw new Error('NO_CHANGE');
      if (
        active &&
        (current.endsAt <= new Date() ||
          (current.usageLimit !== null && current.usageCount >= current.usageLimit))
      )
        throw new Error('NOT_ELIGIBLE');
      const result = await transaction.partnerOnboardingCoupon.updateMany({
        data: { active, version: { increment: 1 } },
        where: { id, version: expectedVersion },
      });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      const nextVersion = expectedVersion + 1;
      await transaction.partnerOnboardingCouponEvent.create({
        data: {
          action: active ? 'ACTIVATED' : 'PAUSED',
          actorUserId: admin.id,
          couponId: id,
          fromActive: current.active,
          reason,
          toActive: active,
          version: nextVersion,
        },
      });
      return { active, code: current.code, id, version: nextVersion };
    });
    return Response.json({ data: coupon });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND')
      return failure('COUPON_NOT_FOUND', 'This launch coupon no longer exists.', 404);
    if (error instanceof Error && error.message === 'VERSION_CONFLICT')
      return failure(
        'COUPON_CHANGED',
        'This coupon changed in another session. Refresh and review it again.',
        409,
      );
    if (error instanceof Error && error.message === 'NO_CHANGE')
      return failure('NO_CHANGE', 'The requested coupon state is already active.', 400);
    if (error instanceof Error && error.message === 'NOT_ELIGIBLE')
      return failure(
        'COUPON_NOT_ELIGIBLE',
        'An expired or exhausted launch coupon cannot be activated.',
        409,
      );
    return failure('COUPON_UPDATE_FAILED', 'The launch coupon could not be updated.', 500);
  }
}
