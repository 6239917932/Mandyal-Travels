import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { HotelOperationalReportRuleError } from '@/lib/pms/operationalReport';
import { getPartnerProfitLoss } from '@/services/partnerProfitLossService';

export const metadata: Metadata = { title: 'Expenses and profit/loss | Mandyal PMS' };

type PageProps = {
  searchParams: Promise<{
    from?: string | string[];
    property?: string | string[];
    through?: string | string[];
  }>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerProfitLossPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card>
            <h1>Administrator access required</h1>
            <p>Property financial performance is restricted to hotel administrators.</p>
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
    report = await getPartnerProfitLoss({
      from: firstValue(values.from),
      memberRole: access.memberRole,
      partnerId: access.partnerId,
      requestedPropertyId,
      through: firstValue(values.through),
    });
  } catch (error) {
    if (!(error instanceof HotelOperationalReportRuleError)) throw error;
    rangeError = error.message;
    report = await getPartnerProfitLoss({
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
              <p className="hotel-page__eyebrow">Finance · management reporting</p>
              <h1>Expenses and profit/loss</h1>
            </div>
          </header>
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before preparing management reports.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Finance · source-backed management view</p>
            <h1>Expenses and profit/loss</h1>
            <p className="booking-page__intro">
              Compare allocated accommodation value, append-only folio charges, collections and
              explicitly classified expense postings for one managed property and period.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/accounting">
              Accounting ledger
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/reports">
              Operational reports
            </Link>
          </div>
        </header>

        <Card>
          <form action="/partner/pms/profit-loss" className="supplier-form__grid" method="get">
            <label className="ui-field">
              <span className="ui-field__label">Managed property</span>
              <select
                className="ui-input"
                defaultValue={report.selectedProperty.id}
                name="property"
              >
                {report.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
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
              Apply reporting period
            </button>
          </form>
        </Card>

        {rangeError ? (
          <p className="booking-page__payment-error" role="alert">
            {rangeError}
          </p>
        ) : null}
        {!report.financialComplete ? (
          <p className="booking-page__payment-error" role="alert">
            {report.safetyLimitReached
              ? 'The report safety limit was reached. Financial totals are withheld until the period is narrowed.'
              : report.currencyConflict
                ? 'Mixed or invalid currencies were found. Financial totals are withheld until the ledgers are reconciled.'
                : report.journalControlFailure
                  ? 'An expense journal is not posted and balanced. Financial totals are withheld pending finance review.'
                  : 'Invalid financial data was found. Financial totals are withheld pending review.'}
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Operating revenue</span>
            <strong>
              {report.financialComplete
                ? money(report.totals.operatingRevenue, report.currency)
                : 'Withheld'}
            </strong>
            <small>Accommodation allocation plus supplemental folio charges</small>
          </Card>
          <Card>
            <span>Recorded expenses</span>
            <strong>
              {report.financialComplete
                ? money(report.totals.recordedExpenses, report.currency)
                : 'Withheld'}
            </strong>
            <small>Only explicit expense-class journal postings</small>
          </Card>
          <Card>
            <span>Provisional result</span>
            <strong>
              {report.financialComplete
                ? money(report.totals.provisionalResult, report.currency)
                : 'Withheld'}
            </strong>
            <small>Management view, not statutory profit</small>
          </Card>
          <Card>
            <span>Folio collections</span>
            <strong>
              {report.financialComplete
                ? money(report.totals.collections, report.currency)
                : 'Withheld'}
            </strong>
            <small>Cash flow evidence; not revenue</small>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Daily performance</p>
          <h2>{report.selectedProperty.name}</h2>
          <div className="pms-room-rack__table-wrap">
            <table className="pms-room-rack__table">
              <thead>
                <tr>
                  <th scope="col">Business date</th>
                  <th scope="col">Accommodation</th>
                  <th scope="col">Folio charges</th>
                  <th scope="col">Recorded expenses</th>
                  <th scope="col">Provisional result</th>
                  <th scope="col">Collections</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.businessDate}>
                    <th scope="row">{row.businessDate}</th>
                    <td>
                      {report.financialComplete
                        ? money(row.accommodationRevenue, report.currency)
                        : 'Withheld'}
                    </td>
                    <td>
                      {report.financialComplete
                        ? money(row.supplementalCharges, report.currency)
                        : 'Withheld'}
                    </td>
                    <td>
                      {report.financialComplete
                        ? money(row.recordedExpenses, report.currency)
                        : 'Withheld'}
                    </td>
                    <td>
                      {report.financialComplete
                        ? money(row.provisionalResult, report.currency)
                        : 'Withheld'}
                    </td>
                    <td>
                      {report.financialComplete
                        ? money(row.collections, report.currency)
                        : 'Withheld'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Recorded expense accounts</p>
          <h2>Expense composition</h2>
          {report.expenseAccountLabels.length ? (
            <ul className="pms-room-rack__queue-list">
              {report.expenseAccountLabels.map((account) => (
                <li key={account.accountCode}>
                  <strong>{account.label}</strong>
                  <span>{money(account.amount, report.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No explicit expense-class journal postings exist for this period. The provisional
              result therefore excludes payroll, vendor invoices, depreciation, bank charges and any
              other costs not already present in the immutable ledger.
            </p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Reporting boundary</p>
          <p>
            This is a read-only management report assembled from confirmed stays, append-only guest
            folios and posted partner-attributed journals. It does not create expenses, infer
            missing costs, replace statutory books, or constitute a GST return or audited profit and
            loss statement.
          </p>
        </Card>
      </div>
    </main>
  );
}
