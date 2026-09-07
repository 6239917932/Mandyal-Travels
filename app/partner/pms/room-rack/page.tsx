import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerPmsRoomRack } from '@/services/partnerPmsRoomRackService';

export const metadata: Metadata = { title: 'Room rack | Mandyal PMS' };

type RoomRackPageProps = {
  searchParams: Promise<{ propertyId?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function statusLabel(status: string): string {
  return status.toLowerCase().replaceAll('_', ' ');
}

export default async function PartnerPmsRoomRackPage({ searchParams }: RoomRackPageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const rack = await getPartnerPmsRoomRack(access.partnerId, firstValue(values.propertyId));

  return (
    <section className="account-page partner-workspace pms-room-rack">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Front office and operations</p>
          <h1>Room rack</h1>
          <p>
            See every registered physical room, current readiness, active stay, and seven-day
            occupancy window from the shared booking record.
          </p>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Live operational view</span>
          <strong>{rack.selectedProperty?.name ?? 'No active property'}</strong>
          <span>Operational date {rack.operationalDate}</span>
          <span>Room assignments remain controlled through Front desk.</span>
        </div>
      </header>

      {!rack.selectedProperty ? (
        <Card className="pms-room-rack__empty">
          <p className="hotel-page__eyebrow">Property setup required</p>
          <h2>Add an active managed property and its physical rooms</h2>
          <p>The room rack does not create duplicate rooms or placeholder inventory.</p>
          <Link className="ui-button ui-button--primary" href="/partner/properties">
            Open property settings
          </Link>
        </Card>
      ) : (
        <>
          <form action="/partner/pms/room-rack" className="pms-room-rack__toolbar" method="get">
            <label>
              Property
              <select defaultValue={rack.selectedProperty.id} name="propertyId">
                {rack.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="ui-button ui-button--secondary" type="submit">
              View room rack
            </button>
            <Link className="ui-button ui-button--primary" href="/partner/pms/walk-in">
              Create walk-in booking
            </Link>
          </form>

          <div className="partner-bookings__summary pms-control-centre__summary">
            <Card>
              <span>Physical rooms</span>
              <strong>{rack.rooms.length}</strong>
              <small>Registered at this property</small>
            </Card>
            <Card>
              <span>Occupied now</span>
              <strong>{rack.occupiedRoomCount}</strong>
              <small>Checked-in room assignments</small>
            </Card>
            <Card>
              <span>Ready rooms</span>
              <strong>{rack.readyRoomCount}</strong>
              <small>Active and housekeeping-ready</small>
            </Card>
            <Card>
              <span>Unassigned arrivals</span>
              <strong>{rack.unassignedArrivalCount}</strong>
              <small>Due today and awaiting front desk</small>
            </Card>
            <Card>
              <span>Assignment conflicts</span>
              <strong>{rack.conflictCount}</strong>
              <small>
                {rack.conflictCount ? 'Requires immediate review' : 'No overlap detected'}
              </small>
            </Card>
          </div>

          <div className="pms-room-rack__legend" aria-label="Room rack legend">
            {['Available', 'Occupied', 'Reserved', 'Dirty', 'Cleaning', 'Out of service'].map(
              (label) => (
                <span
                  className={`pms-room-rack__legend-item pms-room-rack__cell--${label.toLowerCase().replaceAll(' ', '-')}`}
                  key={label}
                >
                  {label}
                </span>
              ),
            )}
          </div>

          {rack.safetyLimitReached ? (
            <div className="pms-control-centre__notice" role="alert">
              <strong>Display safety limit reached</strong>
              <span>
                This read-only view was bounded before rendering. Use Front desk for the complete
                operational record and ask the platform administrator to review property scale.
              </span>
            </div>
          ) : null}

          <div className="pms-room-rack__table-wrap">
            <table className="pms-room-rack__table">
              <caption>
                Seven-day room occupancy beginning {dateLabel(rack.operationalDate)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Room type</th>
                  {rack.dates.map((date) => (
                    <th key={date} scope="col">
                      {dateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rack.rooms.length ? (
                  rack.rooms.map((room) => (
                    <tr key={room.roomNumber}>
                      <th scope="row">
                        {room.roomNumber}
                        <small>{room.floorLabel || 'Floor not set'}</small>
                      </th>
                      <td>
                        {room.roomTypeName}
                        <small>
                          {statusLabel(room.housekeepingStatus)} ·{' '}
                          {statusLabel(room.operationalStatus)}
                        </small>
                      </td>
                      {room.cells.map((cell, index) => (
                        <td
                          className={`pms-room-rack__cell pms-room-rack__cell--${cell.status.toLowerCase().replaceAll('_', '-')}`}
                          key={rack.dates[index]}
                        >
                          <strong>{statusLabel(cell.status)}</strong>
                          {cell.booking ? (
                            <small>
                              {cell.booking.guestName} · {cell.booking.confirmationCode}
                            </small>
                          ) : null}
                          {cell.conflict ? <em>Assignment conflict</em> : null}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={rack.dates.length + 2}>
                      No physical rooms are registered for this property.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="partner-workspace__columns pms-room-rack__queues">
            <Card>
              <p className="hotel-page__eyebrow">Today&apos;s arrivals</p>
              <h2>{rack.arrivals.length} confirmed arrivals</h2>
              {rack.arrivals.length ? (
                <ul>
                  {rack.arrivals.map((arrival) => (
                    <li key={arrival.confirmationCode}>
                      <strong>{arrival.guestName}</strong>
                      <span>
                        {arrival.confirmationCode} · {arrival.rooms} room
                        {arrival.rooms === 1 ? '' : 's'} ·{' '}
                        {arrival.assignedRoomNumbers.length
                          ? arrival.assignedRoomNumbers.join(', ')
                          : 'room assignment pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No arrivals are due today.</p>
              )}
            </Card>
            <Card>
              <p className="hotel-page__eyebrow">Today&apos;s departures</p>
              <h2>{rack.departures.length} in-house departures</h2>
              {rack.departures.length ? (
                <ul>
                  {rack.departures.map((departure) => (
                    <li key={departure.confirmationCode}>
                      <strong>{departure.guestName}</strong>
                      <span>
                        {departure.confirmationCode} ·{' '}
                        {departure.assignedRoomNumbers.join(', ') || 'assignment unavailable'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No checked-in stays depart today.</p>
              )}
            </Card>
          </div>

          <div className="pms-room-rack__actions">
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Open Front desk
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Open Housekeeping
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
