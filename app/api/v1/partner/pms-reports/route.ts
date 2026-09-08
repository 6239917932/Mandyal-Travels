import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelOperationalReportRuleError } from '@/lib/pms/operationalReport';
import {
  getPartnerHotelOperationalReport,
  PartnerHotelReportingError,
} from '@/services/partnerHotelReportingService';
import { createCsv } from '@/utils/csv';

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId || access.partnerType !== 'HOTEL' || access.memberRole !== 'ADMIN') {
    return Response.json(
      {
        error: { code: 'PARTNER_UNAUTHORIZED', message: 'Hotel administrator access is required.' },
      },
      { headers: { 'Cache-Control': 'private, no-store' }, status: 401 },
    );
  }
  const url = new URL(request.url);
  try {
    const report = await getPartnerHotelOperationalReport({
      from: url.searchParams.get('from') ?? undefined,
      memberRole: access.memberRole,
      partnerId: access.partnerId,
      requestedPropertyId: url.searchParams.get('property') ?? undefined,
      through: url.searchParams.get('through') ?? undefined,
    });
    if (!('selectedProperty' in report)) {
      return Response.json(
        {
          error: { code: 'PROPERTY_REQUIRED', message: 'An active managed property is required.' },
        },
        { headers: { 'Cache-Control': 'private, no-store' }, status: 404 },
      );
    }
    if (!report.financialComplete) {
      return Response.json(
        {
          error: {
            code: 'INCOMPLETE_REPORT',
            message: 'The export is withheld because its financial totals are incomplete.',
          },
        },
        { headers: { 'Cache-Control': 'private, no-store' }, status: 422 },
      );
    }
    const rows: Array<Array<string | number>> = [
      [
        'Business date',
        'Arriving rooms',
        'Departing rooms',
        'Folio charges',
        'Folio payments',
        'Cash collections',
        'Posted service orders',
        'Posted service value',
        'Laundry and minibar value',
        'Open cashier shifts',
        'Closed cashier shifts',
        'Night Audit closed',
      ],
    ];
    for (const row of report.rows) {
      rows.push([
        row.businessDate,
        row.arrivals,
        row.departures,
        row.folioCharges,
        row.folioPayments,
        row.cashCollections,
        row.postedServiceOrders,
        row.serviceOrderValue,
        row.laundryAndMinibarValue,
        row.openCashierShifts,
        row.closedCashierShifts,
        row.nightAuditClosed ? 'Yes' : 'No',
      ]);
    }
    return new Response(`${createCsv(rows)}\r\n`, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="hotel-operational-report-${report.from}-${report.through}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Export-Limit': '5000 rows per source',
        'X-Report-Currency': report.currency,
      },
    });
  } catch (error) {
    if (
      error instanceof HotelOperationalReportRuleError ||
      error instanceof PartnerHotelReportingError
    ) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { headers: { 'Cache-Control': 'private, no-store' }, status: 400 },
      );
    }
    throw error;
  }
}
