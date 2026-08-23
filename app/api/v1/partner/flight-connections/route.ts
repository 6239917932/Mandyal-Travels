import { NextResponse } from 'next/server';
import { readJsonObject } from '@/lib/api/request';
import { normalizeProviderCode } from '@/lib/flight/supplierOperations';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { canManageFlightConnections } from '@/lib/partner/permissions';

export async function GET(request: Request) {
  const access = await getPartnerAccess(request);
  if (!canManageFlightConnections(access))
    return NextResponse.json(
      { error: 'Flight supplier administrator access required.' },
      { status: 403 },
    );
  const connections = await prisma.flightSupplierConnection.findMany({
    where: { partnerId: access.partnerId },
    include: { operations: { orderBy: { createdAt: 'desc' }, take: 10 } },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ data: { connections } });
}

export async function POST(request: Request) {
  const access = await getPartnerAccess(request);
  if (!canManageFlightConnections(access))
    return NextResponse.json(
      { error: 'Flight supplier administrator access required.' },
      { status: 403 },
    );
  const body = await readJsonObject(request);
  try {
    const providerCode = normalizeProviderCode(
      typeof body?.providerCode === 'string' ? body.providerCode : '',
    );
    const displayName =
      typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 100) : '';
    const credentialRef =
      typeof body?.credentialRef === 'string' ? body.credentialRef.trim().slice(0, 120) : '';
    const environment = body?.environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
    if (displayName.length < 2 || !/^secret:\/\/[A-Za-z0-9/_-]{3,100}$/.test(credentialRef))
      throw new Error('Enter a display name and a secret-manager credential reference.');
    const connection = await prisma.flightSupplierConnection.create({
      data: { partnerId: access.partnerId, providerCode, displayName, credentialRef, environment },
    });
    await recordPartnerAudit(access, {
      action: 'FLIGHT_CONNECTION_CREATED',
      entityId: connection.id,
      entityType: 'FLIGHT_CONNECTION',
      summary: 'A flight supplier connection was registered.',
      metadata: { providerCode, environment },
    });
    return NextResponse.json({ data: { connection } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid connection.' },
      { status: 400 },
    );
  }
}
