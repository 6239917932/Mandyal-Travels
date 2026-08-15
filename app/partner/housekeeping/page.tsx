import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HousekeepingRoomActions } from '@/components/partner/HousekeepingRoomActions';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Housekeeping board' };

export default async function PartnerHousekeepingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner/housekeeping');
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');

  const properties = await prisma.partnerProperty.findMany({
    include: {
      rooms: {
        include: { physicalRooms: { orderBy: [{ floorLabel: 'asc' }, { roomNumber: 'asc' }] } },
        orderBy: { name: 'asc' },
        where: { status: 'ACTIVE' },
      },
    },
    orderBy: { displayName: 'asc' },
    where: { partnerId: access.partnerId, status: 'ACTIVE' },
  });
  const physicalRooms = properties.flatMap((property) =>
    property.rooms.flatMap((room) =>
      room.physicalRooms.map((physicalRoom) => ({ physicalRoom, property, room })),
    ),
  );
  const ready = physicalRooms.filter(
    ({ physicalRoom }) =>
      physicalRoom.housekeepingStatus === 'READY' && physicalRoom.operationalStatus === 'ACTIVE',
  ).length;
  const dirty = physicalRooms.filter(
    ({ physicalRoom }) =>
      physicalRoom.housekeepingStatus === 'DIRTY' && physicalRoom.operationalStatus === 'ACTIVE',
  ).length;
  const cleaning = physicalRooms.filter(
    ({ physicalRoom }) =>
      physicalRoom.housekeepingStatus === 'CLEANING' && physicalRoom.operationalStatus === 'ACTIVE',
  ).length;
  const outOfService = physicalRooms.filter(
    ({ physicalRoom }) => physicalRoom.operationalStatus === 'OUT_OF_SERVICE',
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
        </div>
      </header>
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
        {physicalRooms.map(({ physicalRoom, property, room }) => (
          <Card className="partner-bookings__booking" key={physicalRoom.id}>
            <div className="booking-confirmation__reference">
              <span>
                {property.displayName} · {room.name}
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
            </div>
            <HousekeepingRoomActions
              housekeepingStatus={physicalRoom.housekeepingStatus}
              operationalStatus={physicalRoom.operationalStatus}
              physicalRoomId={physicalRoom.id}
              propertyId={property.id}
              roomId={room.id}
            />
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
