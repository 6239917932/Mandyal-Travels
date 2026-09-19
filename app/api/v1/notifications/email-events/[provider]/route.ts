import { NextResponse } from 'next/server';

import { readTextBody } from '@/lib/api/request';
import {
  EMAIL_EVENT_MAXIMUM_BYTES,
  parseEmailProviderEvent,
  verifyEmailEventWebhook,
} from '@/lib/notifications/emailSuppression';
import { recordEmailProviderEvent } from '@/services/emailSuppressionService';

export const runtime = 'nodejs';

type Context = { params: Promise<{ provider: string }> };

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;

export async function POST(request: Request, context: Context): Promise<Response> {
  const { provider } = await context.params;
  if (!PROVIDER_PATTERN.test(provider)) {
    return NextResponse.json({ error: { code: 'EMAIL_EVENT_PROVIDER_INVALID' } }, { status: 400 });
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
    return NextResponse.json(
      { error: { code: 'EMAIL_EVENT_CONTENT_TYPE_INVALID' } },
      { status: 415 },
    );
  }
  const payload = await readTextBody(request, EMAIL_EVENT_MAXIMUM_BYTES);
  if (payload === null) {
    return NextResponse.json({ error: { code: 'EMAIL_EVENT_PAYLOAD_TOO_LARGE' } }, { status: 413 });
  }
  const secret = process.env.EMAIL_BOUNCE_WEBHOOK_SECRET?.trim() ?? '';
  if (secret.length < 32 || (process.env.EMAIL_SUPPRESSION_HASH_SECRET?.trim() ?? '').length < 32) {
    return NextResponse.json(
      { error: { code: 'EMAIL_EVENT_WEBHOOK_NOT_CONFIGURED' } },
      { status: 503 },
    );
  }
  if (
    !verifyEmailEventWebhook({
      payload,
      provider,
      secret,
      signature: request.headers.get('x-email-event-signature') ?? '',
      timestamp: request.headers.get('x-email-event-timestamp') ?? '',
    })
  ) {
    return NextResponse.json({ error: { code: 'EMAIL_EVENT_SIGNATURE_INVALID' } }, { status: 401 });
  }

  try {
    const event = parseEmailProviderEvent(payload);
    const result = await recordEmailProviderEvent({ event, payload, provider });
    return NextResponse.json(
      { data: { accepted: true, duplicate: result.duplicate } },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EVENT_ID_CONFLICT') {
      return NextResponse.json({ error: { code: error.message } }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'EMAIL_RECIPIENT_INVALID') {
      return NextResponse.json({ error: { code: 'EMAIL_EVENT_PAYLOAD_INVALID' } }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('EMAIL_EVENT_')) {
      return NextResponse.json({ error: { code: error.message } }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'EMAIL_SUPPRESSION_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: { code: 'EMAIL_EVENT_WEBHOOK_NOT_CONFIGURED' } },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: { code: 'EMAIL_EVENT_PROCESSING_FAILED' } }, { status: 503 });
  }
}
