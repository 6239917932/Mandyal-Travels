import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: {
      product: 'Mandyal Travels API',
      version: 'v1',
      status: 'supported',
      requestIdHeader: 'X-Request-ID',
      pagination: { defaultLimit: 25, maximumLimit: 100 },
      idempotencyHeader: 'Idempotency-Key',
      deprecation: {
        minimumNoticeDays: 180,
        headers: ['Deprecation', 'Sunset', 'Link'],
      },
    },
  });
}
