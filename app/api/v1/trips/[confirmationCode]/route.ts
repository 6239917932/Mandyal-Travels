import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  customerOwnsTrip,
  customerTripResponse,
  normalizeCustomerTripReference,
} from '@/services/customerTripPersistenceRules';

type Context = { params: Promise<{ confirmationCode: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in to manage this trip.' } },
      { status: 401 },
    );
  const { confirmationCode } = await context.params;
  const reference = normalizeCustomerTripReference(confirmationCode);
  if (!reference)
    return Response.json(
      { error: { code: 'INVALID_REFERENCE', message: 'The booking reference is invalid.' } },
      { status: 400 },
    );
  const trip = await prisma.customerTrip.findUnique({
    select: {
      confirmationCode: true,
      currency: true,
      email: true,
      endDate: true,
      productType: true,
      startDate: true,
      status: true,
      subtitle: true,
      title: true,
      totalAmount: true,
      userId: true,
    },
    where: { confirmationCode: reference.confirmationCode },
  });
  const response =
    trip &&
    trip.productType === reference.productType &&
    customerOwnsTrip(trip, { email: user.email, userId: user.id })
      ? customerTripResponse(trip)
      : undefined;
  return response
    ? Response.json({ data: response })
    : Response.json(
        { error: { code: 'TRIP_NOT_FOUND', message: 'The trip was not found in this account.' } },
        { status: 404 },
      );
}
