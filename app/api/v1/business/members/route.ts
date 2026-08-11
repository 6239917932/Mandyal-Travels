import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';

export async function POST() {
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