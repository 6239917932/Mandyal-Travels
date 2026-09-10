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

export const metadata: Metadata = { title: 'Housekeeping requests | Mandyal PMS' };

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function PartnerPmsHousekeepingRequestsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerRoomOperationsWorkspace(access.partnerId);
  const requests = workspace.workOrders.filter((order) => order.category === 'HOUSEKEEPING');
  const active = requests.filter((order) => ['OPEN', 'IN_PROGRESS'].includes(order.status)).length;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Housekeeping · accountable service queue</p>
            <h1>Housekeeping requests</h1>
            <p className="booking-page__intro">
              Assign room cleaning and guest-service requests without incorrectly taking a sellable
              room out of service.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Room readiness
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/maintenance">
              Maintenance
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Resolve older requests before adding more work.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Active requests</span>
            <strong>{active}</strong>
          </Card>
          <Card>
            <span>Recorded requests</span>
            <strong>{requests.length}</strong>
          </Card>
          <Card>
            <span>Managed rooms</span>
            <strong>{workspace.rooms.length}</strong>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">New housekeeping work</p>
          <h2>Open a room request</h2>
          <p>
            The room is marked dirty for housekeeping attention. Use maintenance for a defect that
            must take the room out of service.
          </p>
          <MaintenanceWorkOrderForm
            fixedCategory="HOUSEKEEPING"
            rooms={workspace.rooms.map((room) => ({
              id: room.id,
              label: `${room.property.displayName} · Room ${room.roomNumber} · ${room.roomType.name}`,
            }))}
          />
        </Card>

        <div className="partner-bookings__list">
          {requests.map((request) => (
            <Card className="partner-bookings__booking" key={request.id}>
              <div className="booking-confirmation__reference">
                <span>
                  {request.property.displayName} · Room {request.physicalRoom.roomNumber}
                </span>
                <strong>{request.summary}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Status</span>
                  <strong>{label(request.status)}</strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{label(request.priority)}</strong>
                </div>
                <div>
                  <span>Opened</span>
                  <strong>{request.createdAt.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              {request.description ? <p>{request.description}</p> : null}
              <MaintenanceStatusForm
                status={request.status}
                version={request.version}
                workOrderId={request.id}
              />
            </Card>
          ))}
          {!requests.length ? <Card>No housekeeping requests have been recorded.</Card> : null}
        </div>
      </div>
    </main>
  );
}
