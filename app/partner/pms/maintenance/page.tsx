import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  MaintenanceStatusForm,
  MaintenanceWorkOrderForm,
} from '@/components/partner/HousekeepingMaintenanceControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerRoomOperationsWorkspace } from '@/services/partnerHousekeepingMaintenanceService';

export const metadata: Metadata = { title: 'Maintenance work orders | Mandyal PMS' };

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function PartnerPmsMaintenancePage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerRoomOperationsWorkspace(access.partnerId);
  const active = workspace.workOrders.filter((order) =>
    ['OPEN', 'IN_PROGRESS'].includes(order.status),
  ).length;
  const urgent = workspace.workOrders.filter(
    (order) => ['OPEN', 'IN_PROGRESS'].includes(order.status) && order.priority === 'URGENT',
  ).length;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Engineering · immutable work history</p>
            <h1>Maintenance work orders</h1>
            <p className="booking-page__intro">
              Record room defects, control downtime, and preserve each status transition for review.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Housekeeping
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/room-rack">
              Room rack
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Narrow the operational history before adding more work.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Active work orders</span>
            <strong>{active}</strong>
          </Card>
          <Card>
            <span>Urgent active</span>
            <strong>{urgent}</strong>
          </Card>
          <Card>
            <span>Managed rooms</span>
            <strong>{workspace.rooms.length}</strong>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">New corrective work</p>
          <h2>Open a room work order</h2>
          <p>
            Opening an order immediately takes the room out of service. Resolving the order does not
            return it automatically: housekeeping must record a fresh passed inspection first.
          </p>
          <MaintenanceWorkOrderForm
            rooms={workspace.rooms.map((room) => ({
              id: room.id,
              label: `${room.property.displayName} · Room ${room.roomNumber} · ${room.roomType.name}`,
            }))}
          />
        </Card>

        <div className="partner-bookings__list">
          {workspace.workOrders.map((order) => (
            <Card className="partner-bookings__booking" key={order.id}>
              <div className="booking-confirmation__reference">
                <span>
                  {order.property.displayName} · Room {order.physicalRoom.roomNumber}
                </span>
                <strong>{order.summary}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Status</span>
                  <strong>{label(order.status)}</strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{label(order.priority)}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{label(order.category)}</strong>
                </div>
                <div>
                  <span>Opened</span>
                  <strong>{order.createdAt.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              {order.description ? <p>{order.description}</p> : null}
              <MaintenanceStatusForm
                status={order.status}
                version={order.version}
                workOrderId={order.id}
              />
              <ul className="pms-room-rack__queue-list">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <strong>{label(event.action)}</strong>
                    <span>
                      {event.note || `${label(event.fromStatus)} to ${label(event.toStatus)}`}
                    </span>
                    <small>
                      Version {event.version} · {event.createdAt.toLocaleString('en-IN')}
                    </small>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {!workspace.workOrders.length ? (
            <Card>No maintenance work orders have been recorded.</Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
