import { prisma } from '@/lib/prisma';

const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    await prisma.$transaction([
      prisma.user.findFirst({ select: { id: true } }),
      prisma.organization.findFirst({ select: { id: true } }),
      prisma.booking.findFirst({ select: { id: true } }),
      prisma.businessTravelRequest.findFirst({ select: { id: true } }),
    ]);
    return Response.json(
      { data: { checkedAt, database: 'ready', schema: 'ready', status: 'ready' } },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error('Portal readiness check failed.', error);
    return Response.json(
      {
        data: { checkedAt, status: 'unavailable' },
        error: 'The portal database is temporarily unavailable.',
      },
      { headers: RESPONSE_HEADERS, status: 503 },
    );
  }
}
