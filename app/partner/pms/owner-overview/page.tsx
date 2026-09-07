import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerOwnerOverview } from '@/services/partnerOwnerOverviewService';

export const metadata: Metadata = { title: 'Owner overview | Mandyal PMS' };

type OwnerOverviewPageProps = {
  searchParams: Promise<{ property?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function percent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value}%`;
}

function sourceLabel(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function PartnerOwnerOverviewPage({ searchParams }: OwnerOverviewPageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');

  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <header className="partner-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Owner control · restricted finance</p>
              <h1>Owner overview</h1>
            </div>
          </header>
          <Card>
            <h2>Administrator access required</h2>
            <p>
              This workspace contains property-wide collections and receivables. Ask a hotel partner
              administrator to review it.
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
  const overview = await getPartnerOwnerOverview({
    memberRole: access.memberRole,
    partnerId: access.partnerId,
    requestedPropertyId: firstValue(values.property),
  });
  const property = overview.selectedProperty;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Owner control · source-of-truth snapshot</p>
            <h1>Owner overview</h1>
            <p className="booking-page__intro">
              Review occupancy, booked accommodation value, collections, receivables and daily
              operational exceptions without changing front-desk or financial records.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Open Billing
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/night-audit">
              Open Night audit
            </Link>
          </div>
        </header>

        {!property ? (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before using the owner performance view.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        ) : (
          <>
            <Card>
              <form
                action="/partner/pms/owner-overview"
                className="supplier-form__grid"
                method="get"
              >
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Managed property</span>
                  <select className="ui-input" defaultValue={property.id} name="property">
                    {overview.properties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ui-button ui-button--secondary" type="submit">
                  Review property
                </button>
              </form>
            </Card>

            {overview.safetyLimitReached ? (
              <p className="booking-page__payment-error" role="alert">
                Display safety limit reached. Financial totals are withheld to prevent an incomplete
                owner report; contact the platform administrator.
              </p>
            ) : null}
            {overview.currencyConflict ? (
              <p className="booking-page__payment-error" role="alert">
                Inconsistent or invalid booking currencies were found. Financial totals are withheld
                until the property ledger is reconciled into one reporting currency.
              </p>
            ) : null}
            {overview.performance.roomsSold > overview.performance.activeRooms ? (
              <p className="booking-page__payment-error" role="alert">
                Rooms sold exceed the active physical-room capacity for this operational date.
                Review room setup and reservation inventory before relying on occupancy KPIs.
              </p>
            ) : null}

            <div className="partner-bookings__summary pms-control-centre__summary">
              <Card>
                <span>Operational date</span>
                <strong>{overview.businessDate}</strong>
                <small>{property.name}</small>
              </Card>
              <Card>
                <span>Occupancy</span>
                <strong>{percent(overview.performance.occupancyPercent)}</strong>
                <small>
                  {overview.performance.roomsSold} booked of {overview.performance.activeRooms}{' '}
                  active rooms
                </small>
              </Card>
              <Card>
                <span>Booked accommodation value</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.performance.bookedAccommodationValue, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Allocated confirmed stay value for this date</small>
              </Card>
              <Card>
                <span>ADR</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.performance.adr, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Booked value per occupied room</small>
              </Card>
              <Card>
                <span>RevPAR</span>
                <strong>
                  {overview.financialComplete && overview.performance.revPar !== null
                    ? money(overview.performance.revPar, overview.currency)
                    : 'Unavailable'}
                </strong>
                <small>Booked value per active physical room</small>
              </Card>
            </div>

            <div className="partner-bookings__summary">
              <Card>
                <span>Folio charges</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.financials.charges, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Confirmed stays plus append-only charges</small>
              </Card>
              <Card>
                <span>Collections</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.financials.collections, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Captured and property-recorded payments, net of approved refunds</small>
              </Card>
              <Card>
                <span>Receivables</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.financials.receivables, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Positive outstanding folio balances</small>
              </Card>
              <Card>
                <span>Guest credit balances</span>
                <strong>
                  {overview.financialComplete
                    ? money(overview.financials.creditBalances, overview.currency)
                    : 'Withheld'}
                </strong>
                <small>Payments exceeding current folio charges</small>
              </Card>
            </div>

            <div className="partner-workspace__columns">
              <Card>
                <p className="hotel-page__eyebrow">Daily operations</p>
                <h2>Exceptions requiring attention</h2>
                <ul className="pms-room-rack__queue-list">
                  <li>
                    <strong>{overview.operations.arrivals} arriving rooms</strong>
                    <span>{overview.operations.departures} departing rooms</span>
                  </li>
                  <li>
                    <strong>{overview.operations.readyRooms} ready rooms</strong>
                    <span>{overview.operations.dirtyRooms} dirty rooms</span>
                  </li>
                  <li>
                    <strong>{overview.operations.openCashierShifts} open cashier shifts</strong>
                    <span>{overview.operations.pendingAmendments} pending amendments</span>
                  </li>
                  <li>
                    <strong>
                      {overview.operations.activeMaintenance} active maintenance orders
                    </strong>
                    <span>{overview.operations.totalRooms} registered physical rooms</span>
                  </li>
                </ul>
              </Card>

              <Card>
                <p className="hotel-page__eyebrow">Booking source mix</p>
                <h2>Confirmed stay portfolio</h2>
                {overview.safetyLimitReached ? (
                  <p>Source totals are withheld until the complete booking set can be reviewed.</p>
                ) : overview.sourceMix.length ? (
                  <ul className="pms-room-rack__queue-list">
                    {overview.sourceMix.slice(0, 8).map((source) => (
                      <li key={source.source}>
                        <strong>{sourceLabel(source.source)}</strong>
                        <span>
                          {source.bookings} booking{source.bookings === 1 ? '' : 's'}
                          {overview.financialComplete
                            ? ` · ${money(source.bookedValue, overview.currency)}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No confirmed stays have been recorded for this property.</p>
                )}
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Seven-day performance</p>
              <h2>Stay value and occupancy through the operational date</h2>
              <p>
                Historical occupancy uses today&apos;s active physical-room capacity. Booked value
                is allocated across stay nights and is not a GST invoice or accounting revenue
                entry.
              </p>
              <div className="pms-room-rack__table-wrap">
                <table className="pms-room-rack__table">
                  <thead>
                    <tr>
                      <th scope="col">Business date</th>
                      <th scope="col">Rooms sold</th>
                      <th scope="col">Occupancy</th>
                      <th scope="col">Booked value</th>
                      <th scope="col">ADR</th>
                      <th scope="col">RevPAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.performanceWindow.map((day) => (
                      <tr key={day.businessDate}>
                        <th scope="row">{day.businessDate}</th>
                        <td>{day.roomsSold}</td>
                        <td>{percent(day.occupancyPercent)}</td>
                        <td>
                          {overview.financialComplete
                            ? money(day.bookedAccommodationValue, overview.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {overview.financialComplete
                            ? money(day.adr, overview.currency)
                            : 'Withheld'}
                        </td>
                        <td>
                          {overview.financialComplete && day.revPar !== null
                            ? money(day.revPar, overview.currency)
                            : 'Unavailable'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <p className="hotel-page__eyebrow">Night-audit evidence</p>
              <h2>Recent immutable closes</h2>
              {overview.recentCloses.length ? (
                <ul className="pms-room-rack__queue-list">
                  {overview.recentCloses.map((close) => (
                    <li key={close.businessDate}>
                      <strong>
                        {close.businessDate} → {close.nextBusinessDate}
                      </strong>
                      <span>Closed {new Date(close.closedAt).toLocaleString('en-IN')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No operational dates have been closed for this property yet.</p>
              )}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
