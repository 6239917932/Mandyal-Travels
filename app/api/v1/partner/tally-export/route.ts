import { isSameOriginMutation } from '@/lib/api/request';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { createTallyXml, TallyExportRuleError } from '@/lib/pms/tallyExport';
import { getPartnerTallyExport } from '@/services/partnerTallyExportService';

const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });

export async function GET(request: Request) {
  if (!isSameOriginMutation(request)) {
    return failure(
      'FORBIDDEN_ORIGIN',
      'Download exports from the Mandyal Travels partner portal.',
      403,
    );
  }
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN') {
    return failure(
      'PARTNER_ADMIN_REQUIRED',
      'A hotel partner administrator is required to export accounting data.',
      403,
    );
  }
  const url = new URL(request.url);
  try {
    const result = await getPartnerTallyExport({
      from: url.searchParams.get('from') ?? undefined,
      partnerId: access.partnerId,
      propertyId: url.searchParams.get('property') ?? undefined,
      through: url.searchParams.get('through') ?? undefined,
    });
    if (!result.selectedProperty) {
      return failure('PROPERTY_REQUIRED', 'Add an active managed property before exporting.', 409);
    }
    if (result.safetyLimitReached) {
      return failure(
        'EXPORT_LIMIT_REACHED',
        'Narrow the date range before exporting accounting data.',
        409,
      );
    }
    if (!result.eligibleJournals.length) {
      return failure(
        'NO_ELIGIBLE_JOURNALS',
        'No posted, balanced partner journals are available for this selection.',
        404,
      );
    }
    const xml = createTallyXml({
      companyName: access.partnerName ?? 'Mandyal PMS hotel partner',
      from: result.from,
      journals: result.eligibleJournals,
      propertyName: result.selectedProperty.name,
      through: result.through,
    });
    return new Response(xml, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="tally-partner-journals-${result.from}-${result.through}.xml"`,
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof TallyExportRuleError) {
      return failure(error.code, error.message, 400);
    }
    return failure('TALLY_EXPORT_FAILED', 'The accounting export could not be prepared.', 500);
  }
}
