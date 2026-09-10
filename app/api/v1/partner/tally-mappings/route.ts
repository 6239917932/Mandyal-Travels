import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return failure('FORBIDDEN_ORIGIN', 'Use the Mandyal Travels partner portal.', 403);
  const access = await getPartnerAccess(request);
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    return failure('ACCOUNTING_ACCESS_REQUIRED', 'A hotel administrator is required.', 403);
  const body = await readJsonObject(request, 4096);
  const propertyId =
    typeof body?.propertyId === 'string' ? body.propertyId.trim().slice(0, 100) : '';
  const accountCode =
    typeof body?.accountCode === 'string' ? body.accountCode.trim().toUpperCase().slice(0, 80) : '';
  const tallyLedgerName =
    typeof body?.tallyLedgerName === 'string' ? body.tallyLedgerName.trim().slice(0, 100) : '';
  if (!/^[A-Z0-9_ -]{2,80}$/.test(accountCode) || tallyLedgerName.length < 2)
    return failure('INVALID_TALLY_MAPPING', 'Enter a valid account and Tally ledger name.', 400);
  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: propertyId,
      listingSource: 'MANAGED',
      partnerId: access.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property) return failure('PROPERTY_NOT_FOUND', 'Choose an active managed property.', 404);
  const mapping = await prisma.partnerAccountingMapping.upsert({
    create: {
      accountCode,
      partnerId: access.partnerId,
      propertyId,
      tallyLedgerName,
      updatedByUserId: access.userId,
    },
    update: { tallyLedgerName, updatedByUserId: access.userId, version: { increment: 1 } },
    where: {
      partnerId_propertyId_accountCode: { accountCode, partnerId: access.partnerId, propertyId },
    },
  });
  await recordPartnerAudit(access, {
    action: 'TALLY_LEDGER_MAPPING_SAVED',
    entityId: mapping.id,
    entityType: 'PARTNER_ACCOUNTING_MAPPING',
    summary: `Tally ledger mapping saved for ${accountCode}.`,
  });
  return Response.json({ data: { id: mapping.id, version: mapping.version } }, { status: 201 });
}
