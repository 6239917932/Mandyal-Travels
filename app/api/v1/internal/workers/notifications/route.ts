import { timingSafeEqual } from 'node:crypto';

import { deliverPendingNotifications } from '@/services/notificationDeliveryService';

export const runtime = 'nodejs';

const MINIMUM_SECRET_LENGTH = 32;
const DEFAULT_BATCH_SIZE = 25;

function authorized(request: Request): boolean {
  const configured = process.env.NOTIFICATION_WORKER_SECRET?.trim() ?? '';
  const header = request.headers.get('authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (configured.length < MINIMUM_SECRET_LENGTH || supplied.length !== configured.length)
    return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

function configuredBatchSize(): number {
  const parsed = Number.parseInt(process.env.NOTIFICATION_WORKER_BATCH_SIZE ?? '', 10);
  return Number.isInteger(parsed) ? parsed : DEFAULT_BATCH_SIZE;
}

async function readBatchSize(request: Request): Promise<number> {
  const body = await request.text();
  if (!body.trim()) return configuredBatchSize();

  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_REQUEST_BODY');
  }
  const batchSize = (parsed as Record<string, unknown>).batchSize;
  if (batchSize === undefined) return configuredBatchSize();
  if (typeof batchSize !== 'number' || !Number.isInteger(batchSize)) {
    throw new Error('INVALID_BATCH_SIZE');
  }
  return batchSize;
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await deliverPendingNotifications(await readBatchSize(request));
    return Response.json(summary);
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.message.startsWith('INVALID_'))
    ) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    return Response.json({ error: 'Notification delivery failed' }, { status: 500 });
  }
}
