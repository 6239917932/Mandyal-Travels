import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'mandyal_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function forbiddenResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'This request must originate from the Mandyal Travels portal.',
      },
    },
    { status: 403 },
  );
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method) || !request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return forbiddenResponse();
  }

  const origin = request.headers.get('origin');

  if (origin && origin !== request.nextUrl.origin) {
    return forbiddenResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
