import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ partnerId: string }> };
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const STATE_CODE_PATTERN = /^(0[1-9]|[12][0-9]|3[0-8])$/;

function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function PUT(request: Request, { params }: Context) {
  if (!isSameOriginMutation(request)) {
    return failure('FORBIDDEN_ORIGIN', 'This update must originate from the admin portal.', 403);
  }
  const administrator = await getPlatformAdmin();
  if (!administrator) {
    return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  }
  const body = await readJsonObject(request);
  const { partnerId } = await params;
  const status = body?.gstRegistrationStatus;
  const gstin = typeof body?.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
  const stateCode =
    typeof body?.placeOfSupplyStateCode === 'string' ? body.placeOfSupplyStateCode.trim() : '';
  const expectedVersion = Number(body?.expectedVersion);
  const reason = typeof body?.reason === 'string' ? body.reason.trim().replace(/\s+/g, ' ') : '';
  const section9FiveApplicable = body?.section9FiveApplicable === true;
  const section194OExempt = body?.section194OExempt === true;

  if (
    !['REGISTERED', 'UNREGISTERED'].includes(typeof status === 'string' ? status : '') ||
    !STATE_CODE_PATTERN.test(stateCode) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return failure('TAX_PROFILE_INVALID', 'Complete the reviewed tax classification fields.', 400);
  }
  if (status === 'REGISTERED' && (!GSTIN_PATTERN.test(gstin) || !gstin.startsWith(stateCode))) {
    return failure(
      'GSTIN_INVALID',
      'Enter a valid GSTIN matching the place-of-supply state code.',
      400,
    );
  }
  if (status === 'UNREGISTERED' && (gstin || !section9FiveApplicable)) {
    return failure(
      'SECTION_9_5_REVIEW_REQUIRED',
      'An unregistered hotel must have no GSTIN and a reviewed Section 9(5) classification.',
      400,
    );
  }
  if (status === 'REGISTERED' && section9FiveApplicable) {
    return failure(
      'SECTION_9_5_NOT_APPLICABLE',
      'Do not mark a GST-registered hotel as a Section 9(5) unregistered supply.',
      400,
    );
  }

  const partner = await prisma.supplyPartner.findUnique({ where: { id: partnerId } });
  if (!partner || partner.type !== 'HOTEL') {
    return failure('HOTEL_PARTNER_NOT_FOUND', 'The hotel supplier was not found.', 404);
  }
  try {
    const profile = await prisma.$transaction(async (transaction) => {
      const current = await transaction.partnerTaxProfile.findUnique({ where: { partnerId } });
      if ((current?.version ?? 0) !== expectedVersion) throw new Error('VERSION_CONFLICT');
      const data = {
        effectiveFrom: new Date(),
        gstRegistrationStatus: status as string,
        gstin,
        placeOfSupplyStateCode: stateCode,
        reviewedAt: new Date(),
        reviewStatus: 'VERIFIED',
        section194OExempt,
        section9FiveApplicable,
      };
      const updated = current
        ? await transaction.partnerTaxProfile.update({
            data: { ...data, version: { increment: 1 } },
            where: { id: current.id },
          })
        : await transaction.partnerTaxProfile.create({ data: { ...data, partnerId } });
      await transaction.partnerAuditLog.create({
        data: {
          action: 'TAX_PROFILE_VERIFIED',
          actorUserId: administrator.id,
          entityId: updated.id,
          entityType: 'PARTNER_TAX_PROFILE',
          metadataJson: JSON.stringify({
            gstRegistrationStatus: status,
            placeOfSupplyStateCode: stateCode,
            rule: 'IN-MARKETPLACE-2026-08-31-v1',
            section194OExempt,
            section9FiveApplicable,
          }),
          partnerId,
          summary: reason,
        },
      });
      return updated;
    });
    return Response.json({
      data: { reviewStatus: profile.reviewStatus, version: profile.version },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return failure('TAX_PROFILE_VERSION_CONFLICT', 'Refresh and review the latest profile.', 409);
    }
    throw error;
  }
}
