import { NextResponse } from 'next/server';

import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { EMAIL_PATTERN, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return NextResponse.json(
      { error: 'Business administrator access is required.' },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid traveller email address.' }, { status: 400 });
  }

  const traveller = await prisma.user.findUnique({ where: { email } });
  if (!traveller) {
    return NextResponse.json(
      { error: 'This traveller must create a Mandyal customer account before being added.' },
      { status: 404 },
    );
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId: traveller.id },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: 'This account already belongs to an organization.' },
      { status: 409 },
    );
  }

  const member = await prisma.organizationMember.create({
    data: {
      organizationId: access.membership.organizationId,
      role: 'TRAVELLER',
      userId: traveller.id,
    },
  });

  return NextResponse.json({ data: { id: member.id } }, { status: 201 });
}
