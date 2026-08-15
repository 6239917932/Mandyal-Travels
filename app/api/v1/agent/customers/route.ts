import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { prisma } from '@/lib/prisma';

async function agencyAccess() {
  const access = await getBusinessAdminMembership();
  if (!access) return null;
  const organization = await prisma.organization.findFirst({
    where: { id: access.membership.organizationId, type: 'TRAVEL_AGENCY' },
  });
  return organization ? { ...access, organization } : null;
}

export async function GET() {
  const access = await agencyAccess();
  if (!access)
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  const customers = await prisma.agencyCustomer.findMany({
    where: { organizationId: access.organization.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ data: { customers } });
}

export async function POST(request: Request) {
  const access = await agencyAccess();
  if (!access)
    return NextResponse.json(
      { error: 'Travel agency administrator access required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '');
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
  if (displayName.length < 2 || displayName.length > 120 || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid customer name and email.' }, { status: 400 });
  }
  const customer = await prisma.agencyCustomer.create({
    data: { organizationId: access.organization.id, displayName, email, phone, notes },
  });
  return NextResponse.json({ data: { customer } }, { status: 201 });
}
