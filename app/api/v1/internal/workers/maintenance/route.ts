import { timingSafeEqual } from 'node:crypto';

import {
  MaintenanceAutomationError,
  runSafeMaintenanceAutomation,
} from '@/services/maintenanceAutomationService';

export const runtime = 'nodejs';

const MINIMUM_SECRET_LENGTH = 32;

function authorized(request: Request): boolean {
  const configured = process.env.AUTOPILOT_WORKER_SECRET?.trim() ?? '';
  const header = request.headers.get('authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (configured.length < MINIMUM_SECRET_LENGTH || supplied.length !== configured.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

async function readRequest(
  request: Request,
): Promise<{ batchSize?: unknown; correlationId?: string }> {
  const body = await request.text();
  if (!body.trim()) return {};
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MaintenanceAutomationError('INVALID_REQUEST_BODY');
  }
  const record = parsed as Record<string, unknown>;
  if (record.correlationId !== undefined && typeof record.correlationId !== 'string') {
    throw new MaintenanceAutomationError('INVALID_CORRELATION_ID');
  }
  return { batchSize: record.batchSize, correlationId: record.correlationId as string | undefined };
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await readRequest(request);
    return Response.json(
      await runSafeMaintenanceAutomation({
        batchSize: body.batchSize ?? process.env.AUTOPILOT_WORKER_BATCH_SIZE,
        correlationId: body.correlationId ?? request.headers.get('x-correlation-id') ?? undefined,
        leaseSeconds: process.env.AUTOPILOT_WORKER_LEASE_SECONDS,
      }),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (error instanceof MaintenanceAutomationError) {
      if (
        error.code === 'AUTOMATION_ALREADY_RUNNING' ||
        error.code === 'DUPLICATE_CORRELATION_ID'
      ) {
        return Response.json({ error: 'Maintenance pass already running' }, { status: 409 });
      }
      if (error.code.startsWith('INVALID_')) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
    }
    return Response.json({ error: 'Maintenance automation failed' }, { status: 500 });
  }
}
