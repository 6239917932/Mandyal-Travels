import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getCurrentSession } from '@/lib/auth/session';
import { isPrivacyRequestType, privacyRequestDueAt } from '@/lib/privacy/governance';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const requests = await prisma.dataPrivacyRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ data: { requests } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const body = await readJsonObject(request);
  const requestType = typeof body?.requestType === 'string' ? body.requestType.toUpperCase() : '';
  if (!isPrivacyRequestType(requestType)) {
    return NextResponse.json({ error: 'Select a supported privacy request.' }, { status: 400 });
  }
  const existing = await prisma.dataPrivacyRequest.findFirst({
    where: { userId: session.user.id, requestType, status: { in: ['OPEN', 'IN_REVIEW'] } },
  });
  if (existing) return NextResponse.json({ data: { request: existing, duplicate: true } });
  const created = await prisma.dataPrivacyRequest.create({
    data: { userId: session.user.id, requestType, dueAt: privacyRequestDueAt() },
  });
  return NextResponse.json({ data: { request: created, duplicate: false } }, { status: 201 });
}
