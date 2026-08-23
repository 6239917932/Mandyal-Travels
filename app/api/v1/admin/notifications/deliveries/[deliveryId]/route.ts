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
  const delivery = await prisma.notificationDelivery.findUnique({
    select: { id: true, status: true },
    where: { id: deliveryId },
  });
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
  const nextAttemptAt = new Date();
  const retry = await prisma.notificationDelivery.updateMany({
    data: { lastError: '', nextAttemptAt, status: 'QUEUED' },
    where: { id: delivery.id, status: { in: ['FAILED', 'DEAD_LETTER'] } },
  });
  if (retry.count !== 1)
    return Response.json(
      {
        error: {
          code: 'DELIVERY_NOT_RETRYABLE',
          message: 'Only failed deliveries can be retried.',
        },
      },
      { status: 409 },
    );
  return Response.json({ data: { id: delivery.id, nextAttemptAt, status: 'QUEUED' } });
}
