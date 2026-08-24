import { NextResponse } from 'next/server';

import { API_V1_CONTRACT } from '@/config/apiV1Contract';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: {
      ...API_V1_CONTRACT,
      status: 'supported-local-contracts',
      requestIdHeader: 'X-Request-ID',
      deprecation: {
        minimumNoticeDays: 180,
        headers: ['Deprecation', 'Sunset', 'Link'],
      },
    },
  });
}
