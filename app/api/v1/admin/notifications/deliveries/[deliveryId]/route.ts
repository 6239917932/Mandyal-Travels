import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
type Context = { params: Promise<{ deliveryId: string }> };
export async function PATCH(_request: Request, context: Context): Promise<Response> {
  if (!(await getPlatformAdmin()))
    return Response.json(
      { error: { code: 'ADMIN_UNAUTHORIZED', message: 'Administrator access is required.' } },
      { status: 401 },
    );
  const { deliveryId } = await context.params;
  const delivery = await prisma.notificationDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery)
    return Response.json(
      { error: { code: 'DELIVERY_NOT_FOUND', message: 'The delivery was not found.' } },
      { status: 404 },
    );
  if (!['FAILED', 'DEAD_LETTER'].includes(delivery.status))
    return Response.json(
      {
        error: {
          code: 'DELIVERY_NOT_RETRYABLE',
          message: 'Only failed deliveries can be retried.',
        },
      },
      { status: 409 },
    );
  return Response.json({
    data: await prisma.notificationDelivery.update({
      data: { lastError: '', nextAttemptAt: new Date(), status: 'QUEUED' },
      where: { id: delivery.id },
    }),
  });
}
