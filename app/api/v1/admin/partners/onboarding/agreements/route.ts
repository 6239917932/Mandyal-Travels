import { createHash } from 'node:crypto';

import { getPlatformAdmin } from '@/lib/adminAuth';
import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
import { hasPrismaErrorCode } from '@/lib/prismaErrors';
import type { ApiErrorResponse } from '@/types/commerce';

const RELEASE_KEY = 'SUPPLIER_ONBOARDING';
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

function normalizeAgreementContent(value: unknown) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

function agreementHash(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function GET() {
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const [agreements, release] = await Promise.all([
    prisma.partnerAgreementVersion.findMany({
      include: {
        _count: { select: { acceptances: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.partnerAgreementRelease.findUnique({ where: { key: RELEASE_KEY } }),
  ]);
  return Response.json({ data: { agreements, release } });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels admin portal.', 403);
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request, 120_000);
  const version = typeof body?.version === 'string' ? body.version.trim().toUpperCase() : '';
  const title = typeof body?.title === 'string' ? body.title.trim().replace(/\s+/g, ' ') : '';
  const content = normalizeAgreementContent(body?.content);
  const creationReason = typeof body?.creationReason === 'string' ? body.creationReason.trim() : '';
  if (
    !/^[A-Z0-9][A-Z0-9._-]{2,39}$/.test(version) ||
    title.length < 5 ||
    title.length > 160 ||
    content.length < 200 ||
    content.length > 100_000 ||
    creationReason.length < 10 ||
    creationReason.length > 500
  ) {
    return failure(
      'INVALID_AGREEMENT_DRAFT',
      'Enter a version, title, exact agreement text, and a creation reason between 10 and 500 characters.',
      400,
    );
  }
  try {
    const agreement = await prisma.$transaction(async (transaction) => {
      const created = await transaction.partnerAgreementVersion.create({
        data: {
          content,
          contentHash: agreementHash(content),
          createdByUserId: admin.id,
          status: 'DRAFT',
          title,
          version,
        },
      });
      await transaction.partnerAgreementVersionEvent.create({
        data: {
          action: 'CREATED_DRAFT',
          actorUserId: admin.id,
          agreementVersionId: created.id,
          fromStatus: 'NONE',
          reason: creationReason,
          toStatus: 'DRAFT',
          version: created.governanceVersion,
        },
      });
      return created;
    });
    return Response.json({ data: agreement }, { status: 201 });
  } catch (error) {
    return hasPrismaErrorCode(error, 'P2002')
      ? failure('AGREEMENT_VERSION_EXISTS', 'This agreement version already exists.', 409)
      : failure('AGREEMENT_CREATE_FAILED', 'The agreement draft could not be created.', 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels admin portal.', 403);
  const admin = await getPlatformAdmin();
  if (!admin) return failure('ADMIN_REQUIRED', 'Platform administrator access is required.', 403);
  const body = await readJsonObject(request, 4096);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const action = body?.action === 'APPROVE' || body?.action === 'RETIRE' ? body.action : null;
  const expectedVersion = Number(body?.expectedVersion);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  const confirmation = typeof body?.confirmation === 'string' ? body.confirmation.trim() : '';
  const legalApprovalReference =
    typeof body?.legalApprovalReference === 'string'
      ? body.legalApprovalReference.trim().replace(/\s+/g, ' ')
      : '';
  if (
    !id ||
    !action ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    reason.length < 10 ||
    reason.length > 500 ||
    (action === 'APPROVE' &&
      (legalApprovalReference.length < 10 || legalApprovalReference.length > 200))
  ) {
    return failure(
      'INVALID_AGREEMENT_UPDATE',
      'Choose a valid action and version, provide a bounded reason, and record counsel approval before activation.',
      400,
    );
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.partnerAgreementVersion.findUnique({ where: { id } });
      if (!current) throw new Error('NOT_FOUND');
      if (current.governanceVersion !== expectedVersion) throw new Error('VERSION_CONFLICT');
      if (confirmation !== `${action} ${current.version}`) throw new Error('CONFIRMATION_REQUIRED');

      if (action === 'APPROVE') {
        if (current.status !== 'DRAFT') throw new Error('INVALID_TRANSITION');
        if (!current.content || agreementHash(current.content) !== current.contentHash)
          throw new Error('CONTENT_INTEGRITY_FAILED');
        const changedAt = new Date();
        const updated = await transaction.partnerAgreementVersion.updateMany({
          data: {
            approvedAt: changedAt,
            effectiveAt: changedAt,
            governanceVersion: { increment: 1 },
            retiredAt: null,
            status: 'APPROVED',
          },
          where: { governanceVersion: expectedVersion, id, status: 'DRAFT' },
        });
        if (updated.count !== 1) throw new Error('VERSION_CONFLICT');
        await transaction.partnerAgreementRelease.upsert({
          create: {
            agreementVersionId: id,
            key: RELEASE_KEY,
            updatedByUserId: admin.id,
          },
          update: {
            agreementVersionId: id,
            updatedByUserId: admin.id,
            version: { increment: 1 },
          },
          where: { key: RELEASE_KEY },
        });
        const superseded = await transaction.partnerAgreementVersion.findMany({
          select: { governanceVersion: true, id: true, status: true },
          where: { id: { not: id }, status: 'APPROVED' },
        });
        for (const previous of superseded) {
          const retired = await transaction.partnerAgreementVersion.updateMany({
            data: {
              governanceVersion: { increment: 1 },
              retiredAt: changedAt,
              status: 'RETIRED',
            },
            where: {
              governanceVersion: previous.governanceVersion,
              id: previous.id,
              status: 'APPROVED',
            },
          });
          if (retired.count !== 1) throw new Error('VERSION_CONFLICT');
          await transaction.partnerAgreementVersionEvent.create({
            data: {
              action: 'SUPERSEDED',
              actorUserId: admin.id,
              agreementVersionId: previous.id,
              fromStatus: previous.status,
              legalApprovalReference,
              reason: `Superseded by approved agreement ${current.version}. ${reason}`.slice(
                0,
                500,
              ),
              toStatus: 'RETIRED',
              version: previous.governanceVersion + 1,
            },
          });
        }
        await transaction.partnerAgreementVersionEvent.create({
          data: {
            action: 'APPROVED',
            actorUserId: admin.id,
            agreementVersionId: id,
            fromStatus: current.status,
            legalApprovalReference,
            reason,
            toStatus: 'APPROVED',
            version: expectedVersion + 1,
          },
        });
        return { id, status: 'APPROVED', version: expectedVersion + 1 };
      }

      if (current.status !== 'APPROVED') throw new Error('INVALID_TRANSITION');
      const release = await transaction.partnerAgreementRelease.findUnique({
        where: { key: RELEASE_KEY },
      });
      if (release?.agreementVersionId !== id) throw new Error('NOT_CURRENT_RELEASE');
      const changedAt = new Date();
      const updated = await transaction.partnerAgreementVersion.updateMany({
        data: {
          governanceVersion: { increment: 1 },
          retiredAt: changedAt,
          status: 'RETIRED',
        },
        where: { governanceVersion: expectedVersion, id, status: 'APPROVED' },
      });
      if (updated.count !== 1) throw new Error('VERSION_CONFLICT');
      await transaction.partnerAgreementRelease.delete({ where: { key: RELEASE_KEY } });
      await transaction.partnerAgreementVersionEvent.create({
        data: {
          action: 'RETIRED',
          actorUserId: admin.id,
          agreementVersionId: id,
          fromStatus: current.status,
          reason,
          toStatus: 'RETIRED',
          version: expectedVersion + 1,
        },
      });
      return { id, status: 'RETIRED', version: expectedVersion + 1 };
    });
    return Response.json({ data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND')
      return failure('AGREEMENT_NOT_FOUND', 'This agreement version no longer exists.', 404);
    if (code === 'VERSION_CONFLICT')
      return failure(
        'AGREEMENT_CHANGED',
        'This agreement changed in another session. Refresh and review it again.',
        409,
      );
    if (code === 'CONFIRMATION_REQUIRED')
      return failure('CONFIRMATION_REQUIRED', 'Enter the exact confirmation shown.', 400);
    if (code === 'CONTENT_INTEGRITY_FAILED')
      return failure(
        'CONTENT_INTEGRITY_FAILED',
        'The stored agreement no longer matches its immutable content hash.',
        409,
      );
    if (code === 'NOT_CURRENT_RELEASE')
      return failure(
        'NOT_CURRENT_RELEASE',
        'Only the currently released agreement can be retired.',
        409,
      );
    if (code === 'INVALID_TRANSITION')
      return failure('INVALID_TRANSITION', 'This agreement lifecycle action is not allowed.', 409);
    return failure('AGREEMENT_UPDATE_FAILED', 'The agreement version could not be updated.', 500);
  }
}
