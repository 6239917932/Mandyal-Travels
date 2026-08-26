import { timingSafeEqual } from 'node:crypto';

import {
  SearchProjectionAutomationError,
  runSearchProjectionAutomation,
} from '@/services/searchProjectionAutomationService';

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

async function readRequest(request: Request): Promise<{ correlationId?: string }> {
  const body = await request.text();
  if (!body.trim()) return {};
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SearchProjectionAutomationError('INVALID_REQUEST_BODY');
  }
  const correlationId = (parsed as Record<string, unknown>).correlationId;
  if (correlationId !== undefined && typeof correlationId !== 'string') {
    throw new SearchProjectionAutomationError('INVALID_CORRELATION_ID');
  }
  return { correlationId: correlationId as string | undefined };
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await readRequest(request);
    return Response.json(
      await runSearchProjectionAutomation({
        correlationId: body.correlationId ?? request.headers.get('x-correlation-id') ?? undefined,
        leaseSeconds: process.env.SEARCH_PROJECTION_WORKER_LEASE_SECONDS,
        maximumSourceCount: process.env.SEARCH_PROJECTION_SOURCE_LIMIT,
      }),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (error instanceof SearchProjectionAutomationError) {
      if (
        error.code === 'AUTOMATION_ALREADY_RUNNING' ||
        error.code === 'DUPLICATE_CORRELATION_ID'
      ) {
        return Response.json({ error: 'Search maintenance already running' }, { status: 409 });
      }
      if (error.code.startsWith('INVALID_')) {
        return Response.json({ error: 'Invalid request' }, { status: 400 });
      }
      if (error.code === 'SEARCH_PROJECTION_SOURCE_LIMIT_EXCEEDED') {
        return Response.json({ error: 'Search maintenance requires review' }, { status: 422 });
      }
    }
    return Response.json({ error: 'Search maintenance failed' }, { status: 500 });
  }
}
