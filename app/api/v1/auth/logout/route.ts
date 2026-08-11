import { NextResponse } from 'next/server';

import { deleteCurrentSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await deleteCurrentSession();
  } catch (error) {
    console.error('Session deletion failed during sign-out.', error);
  }
  return NextResponse.redirect(new URL('/', request.url), 303);
}
