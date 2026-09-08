import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelOperationalReportRuleError } from '@/lib/pms/operationalReport';
import { getPartnerHotelOperationalReport } from '@/services/partnerHotelReportingService';

export const metadata: Metadata = { title: 'Operational reports | Mandyal PMS' };

type PageProps = {
  searchParams: Promise<{
    from?: string | string[];
    property?: string | string[];
    through?: string | string[];
  }>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerPmsReportsPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card>
            <h1>Administrator access required</h1>
            <p>
              Property-wide financial and cashier reporting is restricted to hotel administrators.
            </p>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              Return to PMS dashboard
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const values = await searchParams;
  const requestedPropertyId = firstValue(values.property);
  let rangeError = '';
  let report;
  try {
    report = await getPartnerHotelOperationalReport({
      from: firstValue(values.from),
      memberRole: access.memberRole,
      partnerId: access.partnerId,
      requestedPropertyId,
      through: firstValue(values.through),
    });
  } catch (error) {
    if (!(error instanceof HotelOperationalReportRuleError)) throw error;
    rangeError = error.message;
    report = await getPartnerHotelOperationalReport({
      memberRole: access.memberRole,
      partnerId: access.partnerId,
      requestedPropertyId,
    });
  }

  if (!('selectedProperty' in report)) {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <header className="partner-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Operations · bounded source-of-truth export</p>
              <h1>Operational reports</h1>
            </div>
          </header>
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before generating operational reports.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const property = report.selectedProperty;
  const exportParams = property
    ? new URLSearchParams({ from: report.from, property: property.id, through: report.through })
    : null;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Operations · bounded source-of-truth export</p>
            <h1>Operational reports</h1>
            <p className="booking-page__intro">
              Review arrivals, departures, append-only folio activity, cashier collections, guest
              services and Night Audit closes for one managed property and reporting period.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Open Billing
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/gst-billing">
              GST preparation
            </Link>
          </div>
        </header>

        {!property ? (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before generating operational reports.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        ) : (
          <>
            <Card>
              <form action="/partner/pms/reports" className="supplier-form__grid" method="get">
                <label className="ui-field">
                  <span className="ui-field__label">Managed property</span>
                  <select className="ui-input" defaultValue={property.id} name="property">
                    {report.properties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  <span className="ui-field__label">From</span>
                  <input className="ui-input" defaultValue={report.from} name="from" type="date" />
                </label>
                <label className="ui-field">
                  <span className="ui-field__label">Through</span>
                  <input
                    className="ui-input"
                    defaultValue={report.through}
                    name="through"
                    type="date"
                  />
                </label>
                <button className="ui-button ui-button--primary" type="submit">
                  Apply report period
                </button>
                {exportParams && report.financialComplete ? (
                  <a
                    className="ui-button ui-button--secondary"
                    href={`/api/v1/partner/pms-reports?${exportParams.toString()}`}
                  >
                    Download CSV
                  </a>
                ) : null}
              </form>
            </Card>

            {rangeError ? (
              <p className="booking-page__payment-error" role="alert">
                {rangeError}
              </p>
            ) : null}
            {report.safetyLimitReached ? (
              <p className="booking-page__payment-error" role="alert">
                The report safety limit was reached. Financial totals and export are withheld until
                the period is narrowed.
              </p>
            ) : null}
            {report.currencyConflict ? (
              <p className="booking-page__payment-error" role="alert">
                Mixed or invalid ledger currencies were found. Financial totals and export are
                withheld until the property ledger is reconciled.
              </p>
            ) : null}

            <div className="partner-bookings__summary">
              <Card>
                <span>Reporting period</span>
                <strong>
                  {report.from} – {report.through}
                </strong>
                <small>{property.name}</small>
              </Card>
              <Card>
                <span>Arriving rooms</span>
                <strong>{report.totals.arrivals}</strong>
              </Card>
              <Card>
                <span>Departing rooms</span>
                <strong>{report.totals.departures}</strong>
              </Card>
              <Card>
                <span>Folio charges</span>
                <strong>
                  {report.financialComplete
                    ? money(report.totals.folioCharges, report.currency)
                    : 'Withheld'}
                </strong>
              </Card>
              <Card>
                <span>Folio payments</span>
                <strong>
                  {report.financialComplete
                    ? money(report.totals.folioPayments, report.currency)
                    : 'Withheld'}
                </strong>
              </Card>
              <Card>
                <span>Cash collections</span>
                <strong>
                  {report.financialComplete
                    ? money(report.totals.cashCollections, report.currency)
                    : 'Withheld'}
                </strong>
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Daily operating ledger</p>
              <h2>Property activity by business date</h2>
              <p>
                These are operational ledger totals, not recognized accounting revenue, a GST
                return, or a statutory tax invoice.
              </p>
              <div className="pms-room-rack__table-wrap">
                <table className="pms-room-rack__table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Arrivals</th>
                      <th scope="col">Departures</th>
                      <th scope="col">Charges</th>
                      <th scope="col">Payments</th>
                      <th scope="col">Cash</th>
                      <th scope="col">Services</th>
                      <th scope="col">Laundry / minibar</th>
                      <th scope="col">Cashier shifts</th>
                      <th scope="col">Night Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.businessDate}>
                        <th scope="row">{row.businessDate}</th>
                        <td>{row.arrivals}</td>
                        <td>{row.departures}</td>
                        <td>
                          {report.financialComplete
                            ? money(row.folioCharges, report.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {report.financialComplete
                            ? money(row.folioPayments, report.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {report.financialComplete
                            ? money(row.cashCollections, report.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {row.postedServiceOrders}
                          {report.financialComplete
                            ? ` · ${money(row.serviceOrderValue, report.currency)}`
                            : ''}
                        </td>
                        <td>
                          {report.financialComplete
                            ? money(row.laundryAndMinibarValue, report.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {row.openCashierShifts} open · {row.closedCashierShifts} closed
                        </td>
                        <td>{row.nightAuditClosed ? 'Closed' : 'Open'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
