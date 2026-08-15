import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL') return Response.json({ error: { code: 'HOTEL_PARTNER_REQUIRED', message: 'An active hotel supplier account is required.' } }, { status: 403 });
  const body = await readJsonObject(request);
  const reply = typeof body?.reply === 'string' ? body.reply.trim().replace(/\s+/g, ' ').slice(0, 1000) : '';
  if (reply.length < 10) return Response.json({ error: { code: 'INVALID_REPLY', message: 'Enter a property response of at least 10 characters.' } }, { status: 400 });
  const { reviewId } = await context.params;
  const review = await prisma.hotelReview.findUnique({ select: { hotelSlug: true, id: true, status: true }, where: { id: reviewId } });
  if (!review || review.status !== 'PUBLISHED' || !access.allowedHotelSlugs?.includes(review.hotelSlug)) return Response.json({ error: { code: 'REVIEW_NOT_FOUND', message: 'The published review is not available to this supplier.' } }, { status: 404 });
  await prisma.hotelReview.update({ data: { partnerRepliedAt: new Date(), partnerReply: reply }, where: { id: review.id } });
  await recordPartnerAudit(access, { action: 'HOTEL_REVIEW_REPLIED', entityId: review.id, entityType: 'HOTEL_REVIEW', summary: `A property response was published for ${review.hotelSlug}.` });
  return Response.json({ data: { id: review.id } });
}
