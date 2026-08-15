import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ confirmationCode: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in to manage this trip.' } },
      { status: 401 },
    );
  const { confirmationCode } = await context.params;
  const normalizedCode = confirmationCode.trim().toUpperCase();
  if (!/^M[BCF][A-Z0-9]{8,20}$/.test(normalizedCode))
    return Response.json(
      { error: { code: 'INVALID_REFERENCE', message: 'The booking reference is invalid.' } },
      { status: 400 },
    );
  const trip = await prisma.customerTrip.findFirst({
    select: {
      confirmationCode: true,
      currency: true,
      endDate: true,
      productType: true,
      startDate: true,
      status: true,
      subtitle: true,
      title: true,
      totalAmount: true,
    },
    where: { confirmationCode: normalizedCode, userId: user.id },
  });
  return trip
    ? Response.json({ data: trip })
    : Response.json(
        { error: { code: 'TRIP_NOT_FOUND', message: 'The trip was not found in this account.' } },
        { status: 404 },
      );
}
