import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { CENTRAL_RESERVATION_WINDOW_DAYS } from '@/lib/pms/centralReservations';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerCentralReservations } from '@/services/partnerCentralReservationsService';

export const metadata: Metadata = { title: 'Central reservations | Mandyal PMS' };

export default async function PartnerPmsCentralReservationsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerCentralReservations(access.partnerId);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Multi-property · shared reservation source</p>
            <h1>Central reservations</h1>
            <p className="booking-page__intro">
              Review active stays and the next {CENTRAL_RESERVATION_WINDOW_DAYS} days of arrivals
              across every active managed property without creating a second booking record.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Open reservation desk
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/room-rack">
              Room rack
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Totals may be incomplete; use the paginated reservation
            desk and exports for a full review.
          </p>
        ) : null}

        <div className="partner-bookings__summary" aria-label="Central reservation summary">
          <Card>
            <span>Active reservations</span>
            <strong>{workspace.totals.activeReservations}</strong>
          </Card>
          <Card>
            <span>Arriving today</span>
            <strong>{workspace.totals.arrivalsToday}</strong>
          </Card>
          <Card>
            <span>In house</span>
            <strong>{workspace.totals.inHouse}</strong>
          </Card>
          <Card>
            <span>Unassigned today</span>
            <strong>{workspace.totals.unassignedArrivals}</strong>
          </Card>
        </div>

        <div className="partner-bookings__list">
          {workspace.summaries.map((property) => (
            <Card className="partner-bookings__booking" key={property.id}>
              <div className="booking-confirmation__reference">
                <span>Operational date {property.operationalDate}</span>
                <strong>{property.name}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Active reservations</span>
                  <strong>{property.activeReservations}</strong>
                </div>
                <div>
                  <span>Arrivals</span>
                  <strong>{property.arrivalsToday}</strong>
                </div>
                <div>
                  <span>Departures</span>
                  <strong>{property.departuresToday}</strong>
                </div>
                <div>
                  <span>In house</span>
                  <strong>{property.inHouse}</strong>
                </div>
                <div>
                  <span>Unassigned arrivals</span>
                  <strong>{property.unassignedArrivals}</strong>
                </div>
              </div>
            </Card>
          ))}
          {!workspace.summaries.length ? (
            <Card>Add and activate a managed hotel property before centralizing reservations.</Card>
          ) : null}
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Forward arrival queue</p>
          <h2>Upcoming arrivals</h2>
          {workspace.arrivals.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.arrivals.map((arrival) => (
                <li key={arrival.confirmationCode}>
                  <strong>
                    {arrival.checkInDate} · {arrival.propertyName} · {arrival.confirmationCode}
                  </strong>
                  <span>
                    {arrival.guestName} · {arrival.rooms} room{arrival.rooms === 1 ? '' : 's'} ·{' '}
                    {arrival.source === 'PARTNER_DIRECT' ? 'direct' : 'online'}
                  </span>
                  <small>
                    {arrival.assignedRoomNumbers.length
                      ? `Assigned: ${arrival.assignedRoomNumbers.join(', ')}`
                      : 'Room assignment pending'}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No upcoming active arrivals are recorded in this window.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
