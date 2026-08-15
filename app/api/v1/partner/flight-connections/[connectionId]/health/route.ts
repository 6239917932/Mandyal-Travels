import { NextResponse } from 'next/server';
import { flightRequestHash } from '@/lib/flight/supplierOperations';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'FLIGHT')
    return NextResponse.json({ error: 'Flight supplier access required.' }, { status: 403 });
  const { connectionId } = await context.params;
  const connection = await prisma.flightSupplierConnection.findFirst({
    where: { id: connectionId, partnerId: access.partnerId },
  });
  if (!connection) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  const correlationId = crypto.randomUUID();
  const operation = await prisma.flightSupplierOperation.create({
    data: {
      connectionId,
      operationType: 'HEALTH_CHECK',
      correlationId,
      requestHash: flightRequestHash({
        providerCode: connection.providerCode,
        environment: connection.environment,
      }),
    },
  });
  await recordPartnerAudit(access, {
    action: 'FLIGHT_HEALTH_CHECK_QUEUED',
    entityId: operation.id,
    entityType: 'FLIGHT_OPERATION',
    summary: 'A flight supplier health check was queued.',
  });
  return NextResponse.json(
    { data: { operation, providerActivationRequired: true } },
    { status: 202 },
  );
}
