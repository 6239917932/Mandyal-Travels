import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HousekeepingRoomActions } from '@/components/partner/HousekeepingRoomActions';
import { RoomInspectionForm } from '@/components/partner/HousekeepingMaintenanceControls';
import { Card } from '@/components/ui/Card';
import { attendantQueueLabel, buildAttendantQueue } from '@/lib/pms/attendantView';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerRoomOperationsWorkspace } from '@/services/partnerHousekeepingMaintenanceService';

export const metadata: Metadata = { title: 'Attendant view | Mandyal PMS' };

export default async function PartnerPmsAttendantPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');

  const workspace = await getPartnerRoomOperationsWorkspace(access.partnerId);
  const queue = buildAttendantQueue(workspace.rooms, workspace.workOrders);
  const attention = queue.filter((room) => room.queueState !== 'READY').length;
  const ready = queue.length - attention;
  const activeMaintenance = queue.reduce((total, room) => total + room.activeWorkOrders, 0);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Housekeeping · prioritized room queue</p>
            <h1>Attendant view</h1>
            <p className="booking-page__intro">
              Work from the rooms needing attention first, update live readiness, and record an
              inspection before handing a room back to the front desk.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Housekeeping board
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/room-rack">
              Room rack
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/maintenance">
              Maintenance
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Use the full housekeeping and maintenance views before
            assigning additional work.
          </p>
        ) : null}

        <div className="partner-bookings__summary" aria-label="Attendant queue summary">
          <Card>
            <span>Needs attention</span>
            <strong>{attention}</strong>
          </Card>
          <Card>
            <span>Ready</span>
            <strong>{ready}</strong>
          </Card>
          <Card>
            <span>Active maintenance</span>
            <strong>{activeMaintenance}</strong>
          </Card>
          <Card>
            <span>Managed rooms</span>
            <strong>{queue.length}</strong>
          </Card>
        </div>

        <div className="partner-bookings__list">
          {queue.map((room) => (
            <Card className="partner-bookings__booking" key={room.id}>
              <div className="booking-confirmation__reference">
                <span>
                  {room.propertyName} · {room.roomTypeName}
                </span>
                <strong>Room {room.roomNumber}</strong>
              </div>
              <div className="booking-confirmation__details">
                <div>
                  <span>Queue priority</span>
                  <strong>{attendantQueueLabel(room.queueState)}</strong>
                </div>
                <div>
                  <span>Floor / wing</span>
                  <strong>{room.floorLabel || 'Not specified'}</strong>
                </div>
                <div>
                  <span>Housekeeping</span>
                  <strong>{room.housekeepingStatus.toLowerCase()}</strong>
                </div>
                <div>
                  <span>Open maintenance</span>
                  <strong>{room.activeWorkOrders}</strong>
                </div>
                <div>
                  <span>Room notes</span>
                  <strong>{room.notes || 'No notes'}</strong>
                </div>
              </div>
              <HousekeepingRoomActions
                housekeepingStatus={room.housekeepingStatus}
                operationalStatus={room.operationalStatus}
                physicalRoomId={room.id}
                propertyId={room.propertyId}
                roomId={room.roomTypeId}
              />
              <RoomInspectionForm physicalRoomId={room.id} />
              {room.latestInspection ? (
                <p>
                  Latest inspection: {room.latestInspection.result.toLowerCase()} · business date{' '}
                  {room.latestInspection.businessDate} ·{' '}
                  {room.latestInspection.inspectedAt.toLocaleString('en-IN')}
                </p>
              ) : (
                <p>No inspection recorded yet.</p>
              )}
            </Card>
          ))}
          {!queue.length ? (
            <Card>Add an active managed property and physical rooms to begin attendant work.</Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
