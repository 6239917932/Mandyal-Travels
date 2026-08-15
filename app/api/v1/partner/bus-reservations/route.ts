import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import type { ApiErrorResponse } from '@/types/commerce';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'BUS')
    return failure('BUS_PARTNER_REQUIRED', 'An active bus operator account is required.', 403);
  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get('page') ?? '1');
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 50;
  const where = { partnerId: access.partnerId };
  const [data, totalCount, confirmedCount, captured] = await Promise.all([
    prisma.partnerBusReservation.findMany({
      include: {
        trip: { include: { route: { select: { destination: true, origin: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
    prisma.partnerBusReservation.count({ where }),
    prisma.partnerBusReservation.count({ where: { ...where, status: 'CONFIRMED' } }),
    prisma.partnerBusReservation.aggregate({
      _sum: { totalAmount: true },
      where: { ...where, status: 'CONFIRMED' },
    }),
  ]);
  return Response.json({
    data,
    meta: {
      capturedInrValue: captured._sum.totalAmount ?? 0,
      confirmedCount,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    },
  });
}
