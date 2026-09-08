import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HousekeepingRoomActions } from '@/components/partner/HousekeepingRoomActions';
import { RoomInspectionForm } from '@/components/partner/HousekeepingMaintenanceControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerRoomOperationsWorkspace } from '@/services/partnerHousekeepingMaintenanceService';

export const metadata: Metadata = { title: 'Housekeeping board' };

export default async function PartnerHousekeepingPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');

  const workspace = await getPartnerRoomOperationsWorkspace(access.partnerId);
  const physicalRooms = workspace.rooms;
  const activeMaintenanceByRoom = new Map<string, number>();
  for (const workOrder of workspace.workOrders) {
    if (!['OPEN', 'IN_PROGRESS'].includes(workOrder.status)) continue;
    activeMaintenanceByRoom.set(
      workOrder.physicalRoomId,
      (activeMaintenanceByRoom.get(workOrder.physicalRoomId) ?? 0) + 1,
    );
  }
  const ready = physicalRooms.filter(
    (room) => room.housekeepingStatus === 'READY' && room.operationalStatus === 'ACTIVE',
  ).length;
  const dirty = physicalRooms.filter(
    (room) => room.housekeepingStatus === 'DIRTY' && room.operationalStatus === 'ACTIVE',
  ).length;
  const cleaning = physicalRooms.filter(
    (room) => room.housekeepingStatus === 'CLEANING' && room.operationalStatus === 'ACTIVE',
  ).length;
  const outOfService = physicalRooms.filter(
    (room) => room.operationalStatus === 'OUT_OF_SERVICE',
  ).length;

  return (
    <section className="account-page partner-workspace">
      <header className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Hotel PMS</p>
          <h1>Housekeeping board</h1>
          <p>
            Coordinate room turnaround and keep front-desk allocation synchronized with room
            readiness.
          </p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/partner">
            Workspace
          </Link>
          <Link className="ui-button ui-button--secondary" href="/partner/properties">
            Room registry
          </Link>
          <Link className="ui-button ui-button--secondary" href="/partner/bookings">
            Front desk
          </Link>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/maintenance">
            Maintenance
          </Link>
        </div>
      </header>
      {workspace.safetyLimitReached ? (
        <p className="booking-page__payment-error" role="alert">
          Display safety limit reached. Review archived maintenance history before adding more
          operational work.
        </p>
      ) : null}
      <div className="partner-bookings__summary">
        <Card>
          <span>Ready</span>
          <strong>{ready}</strong>
        </Card>
        <Card>
          <span>Dirty</span>
          <strong>{dirty}</strong>
        </Card>
        <Card>
          <span>Cleaning</span>
          <strong>{cleaning}</strong>
        </Card>
        <Card>
          <span>Out of service</span>
          <strong>{outOfService}</strong>
        </Card>
      </div>
      <div className="partner-bookings__list">
        {physicalRooms.map((physicalRoom) => (
          <Card className="partner-bookings__booking" key={physicalRoom.id}>
            <div className="booking-confirmation__reference">
              <span>
                {physicalRoom.property.displayName} · {physicalRoom.roomType.name}
              </span>
              <strong>Room {physicalRoom.roomNumber}</strong>
            </div>
            <div className="booking-confirmation__details">
              <div>
                <span>Floor / wing</span>
                <strong>{physicalRoom.floorLabel || 'Not specified'}</strong>
              </div>
              <div>
                <span>Housekeeping</span>
                <strong>{physicalRoom.housekeepingStatus.toLowerCase()}</strong>
              </div>
              <div>
                <span>Service</span>
                <strong>{physicalRoom.operationalStatus.toLowerCase().replaceAll('_', ' ')}</strong>
              </div>
              <div>
                <span>Room notes</span>
                <strong>{physicalRoom.notes || 'No notes'}</strong>
              </div>
              <div>
                <span>Open maintenance</span>
                <strong>{activeMaintenanceByRoom.get(physicalRoom.id) ?? 0}</strong>
              </div>
            </div>
            <HousekeepingRoomActions
              housekeepingStatus={physicalRoom.housekeepingStatus}
              operationalStatus={physicalRoom.operationalStatus}
              physicalRoomId={physicalRoom.id}
              propertyId={physicalRoom.propertyId}
              roomId={physicalRoom.roomTypeId}
            />
            <RoomInspectionForm physicalRoomId={physicalRoom.id} />
            {physicalRoom.housekeepingInspections.length ? (
              <ul className="pms-room-rack__queue-list">
                {physicalRoom.housekeepingInspections.map((inspection) => (
                  <li key={inspection.id}>
                    <strong>{inspection.result.toLowerCase()} inspection</strong>
                    <span>{inspection.note || 'No inspection note'}</span>
                    <small>
                      Business date {inspection.businessDate} ·{' '}
                      {inspection.inspectedAt.toLocaleString('en-IN')}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No room inspection has been recorded yet.</p>
            )}
          </Card>
        ))}
        {physicalRooms.length === 0 ? (
          <Card>
            No physical rooms are registered yet. Add them from the property room registry.
          </Card>
        ) : null}
      </div>
    </section>
  );
}
