import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

const postures = new Set(['ACKNOWLEDGED', 'EVIDENCE_READY', 'NO_LOCAL_RECORD_FOUND']);
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    return failure('PRIVACY_ACCESS_REQUIRED', 'A hotel administrator is required.', 403);
  const body = await readJsonObject(request, 4096);
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim().slice(0, 100) : '';
  const posture = typeof body?.posture === 'string' ? body.posture.trim().toUpperCase() : '';
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';
  if (!postures.has(posture) || note.length < 10)
    return failure(
      'INVALID_PRIVACY_EVIDENCE',
      'Choose a posture and enter a note of at least 10 characters.',
      400,
    );
  const privacyRequest = await prisma.dataPrivacyRequest.findFirst({
    select: { id: true, user: { select: { email: true } } },
    where: { id: requestId, status: { in: ['OPEN', 'IN_REVIEW'] } },
  });
  if (!privacyRequest)
    return failure('PRIVACY_REQUEST_NOT_FOUND', 'The open privacy request was not found.', 404);
  const guest = await prisma.bookingGuest.findFirst({
    select: { id: true },
    where: {
      booking: {
        hotelSlug: {
          in: await prisma.partnerProperty
            .findMany({
              select: { hotelSlug: true },
              where: { listingSource: 'MANAGED', partnerId: access.partnerId, status: 'ACTIVE' },
            })
            .then((rows) => rows.map((row) => row.hotelSlug)),
        },
      },
      email: privacyRequest.user.email,
    },
  });
  if (!guest)
    return failure(
      'PRIVACY_SCOPE_DENIED',
      'This request is not connected to a guest of your managed properties.',
      403,
    );
  await recordPartnerAudit(access, {
    action: 'PARTNER_PRIVACY_EVIDENCE_RECORDED',
    entityId: privacyRequest.id,
    entityType: 'DATA_PRIVACY_REQUEST',
    metadata: { note, posture },
    summary: `Hotel privacy response evidence recorded: ${posture}.`,
  });
  return Response.json({ data: { requestId: privacyRequest.id } }, { status: 201 });
}
