import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { correlationIdFromHeader } from '@/lib/api/correlation';

const SESSION_COOKIE_NAME = 'mandyal_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function forbiddenResponse(requestId: string) {
  const response = NextResponse.json(
    {
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'This request must originate from the Mandyal Travels portal.',
      },
    },
    { status: 403, headers: { 'x-request-id': requestId } },
  );
  return response;
}

export function proxy(request: NextRequest) {
  const requestId = correlationIdFromHeader(request.headers.get('x-request-id'));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  if (SAFE_METHODS.has(request.method) || !request.cookies.has(SESSION_COOKIE_NAME)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return forbiddenResponse(requestId);
  }

  const origin = request.headers.get('origin');

  if (origin && origin !== request.nextUrl.origin) {
    return forbiddenResponse(requestId);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
