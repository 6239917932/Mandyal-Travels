import { timingSafeEqual } from 'node:crypto';

import {
  HotelbedsContentAutomationError,
  runHotelbedsContentAutomation,
} from '@/services/hotelbedsContentAutomationService';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const configured = process.env.AUTOPILOT_WORKER_SECRET?.trim() ?? '';
  const header = request.headers.get('authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (configured.length < 32 || supplied.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const bodyText = await request.text();
    const parsed: unknown = bodyText.trim() ? JSON.parse(bodyText) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HotelbedsContentAutomationError('INVALID_REQUEST_BODY');
    }
    const correlationId = (parsed as Record<string, unknown>).correlationId;
    if (correlationId !== undefined && typeof correlationId !== 'string') {
      throw new HotelbedsContentAutomationError('INVALID_CORRELATION_ID');
    }
    return Response.json(
      await runHotelbedsContentAutomation({
        correlationId:
          (correlationId as string | undefined) ??
          request.headers.get('x-correlation-id') ??
          undefined,
        maximumPages: process.env.HOTELBEDS_CONTENT_MAX_PAGES_PER_RUN,
      }),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (error instanceof HotelbedsContentAutomationError) {
      if (
        error.code === 'AUTOMATION_ALREADY_RUNNING' ||
        error.code === 'DUPLICATE_CORRELATION_ID'
      ) {
        return Response.json({ error: 'Content synchronization already running' }, { status: 409 });
      }
      if (error.code.startsWith('INVALID_')) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
      if (error.code === 'CONTENT_SYNC_DISABLED' || error.code === 'HOTELBEDS_DISABLED') {
        return Response.json({ error: 'Content synchronization is disabled' }, { status: 422 });
      }
    }
    return Response.json({ error: 'Content synchronization failed' }, { status: 500 });
  }
}
