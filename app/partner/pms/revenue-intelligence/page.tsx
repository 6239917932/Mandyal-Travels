import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { MetricBars } from '@/components/ui/DashboardCharts';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerOwnerOverview } from '@/services/partnerOwnerOverviewService';

export const metadata: Metadata = { title: 'Revenue intelligence | Mandyal PMS' };

type RevenueIntelligencePageProps = {
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

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function percentage(value: number | null): string {
  return value === null ? 'Unavailable' : `${value}%`;
}

export default async function RevenueIntelligencePage({
  searchParams,
}: RevenueIntelligencePageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');

  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card>
            <h1>Administrator access required</h1>
            <p>
              Property-wide demand and booked-value guidance is restricted to hotel administrators.
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

  if (!property || !('revenueIntelligence' in overview)) {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <header className="partner-page__heading">
            <div>
              <p className="hotel-page__eyebrow">Revenue · governed decision support</p>
              <h1>Revenue intelligence</h1>
            </div>
          </header>
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before reviewing demand.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const intelligence = overview.revenueIntelligence;
  const financialComplete = overview.financialComplete;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Revenue · governed decision support</p>
            <h1>Revenue intelligence</h1>
            <p className="booking-page__intro">
              Review thirty days of confirmed demand, capacity exceptions and explainable operating
              prompts. Nothing on this page changes a rate, restriction or channel automatically.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Open rate management
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/owner-overview">
              Owner overview
            </Link>
          </div>
        </header>

        <Card>
          <form
            action="/partner/pms/revenue-intelligence"
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
            The source-data safety limit was reached. Financial guidance is withheld until a
            complete bounded report can be generated.
          </p>
        ) : null}
        {overview.currencyConflict ? (
          <p className="booking-page__payment-error" role="alert">
            Multiple or invalid booking currencies were found. Booked-value guidance is withheld
            until the property ledger is reconciled.
          </p>
        ) : null}

        <div className="partner-bookings__summary pms-control-centre__summary">
          <Card>
            <span>Operational date</span>
            <strong>{overview.businessDate}</strong>
            <small>{property.name}</small>
          </Card>
          <Card>
            <span>Next 7 days</span>
            <strong>{percentage(intelligence.summary.averageSevenDayOccupancy)}</strong>
            <small>Average confirmed occupancy</small>
          </Card>
          <Card>
            <span>Next 30 days</span>
            <strong>{intelligence.summary.bookedRoomNights}</strong>
            <small>Confirmed booked room-nights</small>
          </Card>
          <Card>
            <span>Booked stay value</span>
            <strong>
              {financialComplete
                ? money(intelligence.summary.projectedBookedValue, overview.currency)
                : 'Withheld'}
            </strong>
            <small>Allocated across the next 30 stay dates</small>
          </Card>
          <Card>
            <span>Capacity exceptions</span>
            <strong>{intelligence.summary.oversoldDates}</strong>
            <small>Dates above active physical-room capacity</small>
          </Card>
        </div>

        <div className="dashboard-insights-grid">
          <MetricBars
            description="Confirmed rooms divided by today's active physical-room capacity. This is on-books demand, not a market forecast."
            eyebrow="Seven-day on-books demand"
            items={intelligence.calendar.slice(0, 7).map((day) => ({
              label: dateLabel(day.businessDate),
              value: day.occupancyPercent ?? 0,
            }))}
            maximumValue={100}
            title="Booked occupancy"
            valueSuffix="%"
          />
          <Card>
            <p className="hotel-page__eyebrow">Data sufficiency</p>
            <h2>{intelligence.dataQuality.label}</h2>
            <p>{intelligence.dataQuality.message}</p>
            <ul className="pms-room-rack__queue-list">
              <li>
                <strong>{intelligence.dataQuality.historicalBookings} completed bookings</strong>
                <span>within the controlled 90-day observation window</span>
              </li>
              <li>
                <strong>{intelligence.dataQuality.observationDays} observed departure dates</strong>
                <span>used only to assess whether history is sufficient</span>
              </li>
            </ul>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Explainable review queue</p>
          <h2>Dates requiring an operator review</h2>
          <p>
            Prompts use only active capacity and confirmed Mandyal booking records. They do not use
            competitor prices, events, scraped data or an external demand feed.
          </p>
          {intelligence.reviewQueue.length ? (
            <ul className="pms-room-rack__queue-list">
              {intelligence.reviewQueue.map((prompt) => (
                <li key={`${prompt.businessDate}-${prompt.priority}`}>
                  <strong>
                    {dateLabel(prompt.businessDate)} · {prompt.priority.toLowerCase()}
                  </strong>
                  <span>
                    {prompt.reason}. {prompt.action}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No capacity or near-term occupancy exception is currently in the review queue.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Thirty-day demand calendar</p>
          <h2>Confirmed room demand and stay value</h2>
          <p>
            Figures are operational planning values, not a statutory revenue statement. ADR and
            RevPAR use allocated confirmed booking value and current active room capacity.
          </p>
          <div className="pms-room-rack__table-wrap">
            <table className="pms-room-rack__table">
              <thead>
                <tr>
                  <th scope="col">Stay date</th>
                  <th scope="col">Rooms sold</th>
                  <th scope="col">Occupancy</th>
                  <th scope="col">Booked value</th>
                  <th scope="col">ADR</th>
                  <th scope="col">RevPAR</th>
                  <th scope="col">Capacity status</th>
                </tr>
              </thead>
              <tbody>
                {intelligence.calendar.map((day) => (
                  <tr key={day.businessDate}>
                    <th scope="row">{dateLabel(day.businessDate)}</th>
                    <td>
                      {day.roomsSold} / {day.activeRooms}
                    </td>
                    <td>{percentage(day.occupancyPercent)}</td>
                    <td>
                      {financialComplete
                        ? money(day.bookedAccommodationValue, overview.currency)
                        : 'Withheld'}
                    </td>
                    <td>{financialComplete ? money(day.adr, overview.currency) : 'Withheld'}</td>
                    <td>
                      {financialComplete && day.revPar !== null
                        ? money(day.revPar, overview.currency)
                        : 'Unavailable'}
                    </td>
                    <td>
                      {day.oversoldRooms > 0
                        ? `${day.oversoldRooms} room${day.oversoldRooms === 1 ? '' : 's'} over capacity`
                        : 'Within capacity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="pms-control-centre__notice" role="note">
          <span>Control boundary</span>
          <p>
            Revenue intelligence is read-only. Publishing a rate or restriction still requires an
            authorized operator in Rate management. External OTA updates remain unavailable until a
            certified provider connection is active.
          </p>
        </div>
      </div>
    </main>
  );
}
