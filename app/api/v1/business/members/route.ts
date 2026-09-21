import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { isSameOriginMutation } from '@/lib/api/request';

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error:
        'Direct member addition is no longer supported. Send a secure traveller invitation instead.',
    },
    { status: 410 },
  );
}
