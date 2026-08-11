import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';
import { exportLimitExceededResponse, MAX_EXPORT_ROWS } from '@/lib/reporting/exportLimit';
import {
  buildBusinessAuditWhere,
  parseBusinessAuditFilters,
} from '@/services/businessAuditReportService';
import { createCsv } from '@/utils/csv';

export async function GET(request: Request) {
  const access = await getBusinessAdminMembership();
  if (!access) {
    return Response.json({ error: 'Business administrator access is required.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseBusinessAuditFilters(Object.fromEntries(url.searchParams.entries()));
  const entries = await prisma.businessAuditLog.findMany({
    include: { actor: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT_ROWS + 1,
    where: buildBusinessAuditWhere(access.membership.organizationId, filters),
  });
  if (entries.length > MAX_EXPORT_ROWS) {
    return exportLimitExceededResponse(
      `This audit export contains more than ${MAX_EXPORT_ROWS.toLocaleString('en-IN')} rows. Narrow the date, action, or search filters and export again.`,
    );
  }

  const header = [
    'Timestamp',
    'Action',
    'Summary',
    'Actor name',
    'Actor email',
    'Entity type',
    'Entity id',
    'Metadata',
  ];
  const rows = entries.map((entry) => [
    entry.createdAt.toISOString(),
    entry.action,
    entry.summary,
    entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System',
    entry.actor?.email ?? '',
    entry.entityType,
    entry.entityId,
    entry.metadataJson,
  ]);

  return new Response(createCsv([header, ...rows]), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="mandyal-company-audit-log.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
