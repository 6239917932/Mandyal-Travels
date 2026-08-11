import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

type MemberRouteContext = { params: Promise<{ membershipId: string }> };

export async function DELETE(_request: Request, { params }: MemberRouteContext) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const { membershipId } = await params;
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: membershipId,
      organizationId: access.membership.organizationId,
      role: 'TRAVELLER',
    },
  });
  if (!member) {
    return NextResponse.json({ error: 'The traveller membership was not found.' }, { status: 404 });
  }

  await prisma.organizationMember.delete({ where: { id: member.id } });
  return NextResponse.json({ data: { id: member.id } });
}
