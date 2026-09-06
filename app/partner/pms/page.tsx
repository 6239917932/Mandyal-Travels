import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { countPmsModules, pmsModuleGroups, pmsModules } from '@/lib/pms/moduleRegistry';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Mandyal PMS control centre' };

function localDate(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function PmsControlCentrePage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');

  const properties = await prisma.partnerProperty.findMany({
    select: { hotelSlug: true, id: true, timezone: true },
    where: { partnerId: access.partnerId, status: 'ACTIVE' },
  });
  const propertyIds = properties.map((property) => property.id);
  const hotelSlugs = properties.map((property) => property.hotelSlug);
  const today = localDate(properties[0]?.timezone || 'Asia/Kolkata');

  const [roomStates, arrivals, departures, inHouse, pendingAmendments] = await Promise.all([
    prisma.partnerPhysicalRoom.groupBy({
      _count: { _all: true },
      by: ['housekeepingStatus', 'operationalStatus'],
      where: { propertyId: { in: propertyIds } },
    }),
    prisma.booking.count({
      where: {
        hotelSlug: { in: hotelSlugs },
        operationalStatus: 'RESERVED',
        quote: { checkInDate: today },
        status: 'confirmed',
      },
    }),
    prisma.booking.count({
      where: {
        hotelSlug: { in: hotelSlugs },
        operationalStatus: 'CHECKED_IN',
        quote: { checkOutDate: today },
        status: 'confirmed',
      },
    }),
    prisma.booking.count({
      where: {
        hotelSlug: { in: hotelSlugs },
        operationalStatus: 'CHECKED_IN',
        status: 'confirmed',
      },
    }),
    prisma.bookingAmendment.count({
      where: { booking: { hotelSlug: { in: hotelSlugs } }, status: 'PENDING' },
    }),
  ]);

  const roomCount = roomStates.reduce((total, state) => total + state._count._all, 0);
  const readyRooms = roomStates
    .filter((state) => state.housekeepingStatus === 'READY' && state.operationalStatus === 'ACTIVE')
    .reduce((total, state) => total + state._count._all, 0);
  const dirtyRooms = roomStates
    .filter((state) => state.housekeepingStatus === 'DIRTY')
    .reduce((total, state) => total + state._count._all, 0);
  const unavailableRooms = roomStates
    .filter((state) => state.operationalStatus !== 'ACTIVE')
    .reduce((total, state) => total + state._count._all, 0);
  const activeRoomCount = Math.max(0, roomCount - unavailableRooms);
  const occupancy = activeRoomCount ? Math.round((inHouse / activeRoomCount) * 100) : 0;

  return (
    <section className="account-page partner-workspace pms-control-centre">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Mandyal hotel operations</p>
          <h1>PMS control centre</h1>
          <p>
            One property-scoped workspace for front desk, rooms, rates, guest operations, finance,
            controls and reporting.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--primary" href="/partner/bookings">
              Open front desk
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
              Open housekeeping
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Rates and availability
            </Link>
          </div>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Operational date {today}</span>
          <strong>{properties.length} active properties</strong>
          <span>{countPmsModules('LIVE')} modules already operational</span>
          <span>Planned modules stay unavailable until their controls and tests are complete.</span>
        </div>
      </header>

      <div className="partner-bookings__summary pms-control-centre__summary">
        <Card>
          <span>Occupancy</span>
          <strong>{occupancy}%</strong>
          <small>{inHouse} checked-in stays</small>
        </Card>
        <Card>
          <span>Arrivals today</span>
          <strong>{arrivals}</strong>
          <small>Confirmed and awaiting check-in</small>
        </Card>
        <Card>
          <span>Departures today</span>
          <strong>{departures}</strong>
          <small>Currently checked in</small>
        </Card>
        <Card>
          <span>Ready rooms</span>
          <strong>{readyRooms}</strong>
          <small>
            {dirtyRooms} dirty · {unavailableRooms} unavailable
          </small>
        </Card>
        <Card>
          <span>Amendments</span>
          <strong>{pendingAmendments}</strong>
          <small>Waiting for property review</small>
        </Card>
      </div>

      <div className="pms-control-centre__notice" role="note">
        <strong>Controlled rollout</strong>
        <span>
          Live links use production data today. Foundation and planned areas are listed for delivery
          visibility, but cannot be opened or mistaken for completed software.
        </span>
      </div>

      {pmsModuleGroups.map((group) => (
        <section className="pms-control-centre__group" key={group}>
          <div className="pms-control-centre__group-heading">
            <p className="hotel-page__eyebrow">{group}</p>
            <h2>{group} modules</h2>
          </div>
          <div className="partner-workspace__links">
            {pmsModules
              .filter((module) => module.group === group)
              .map((module) => (
                <Card className="pms-module-card" key={module.name}>
                  <div className="pms-module-card__status">
                    <span
                      className={`partner-status partner-status--${module.status.toLowerCase()}`}
                    >
                      {module.status === 'LIVE'
                        ? 'Live'
                        : module.status === 'FOUNDATION'
                          ? 'Foundation'
                          : `Phase ${module.phase}`}
                    </span>
                    <small>Phase {module.phase}</small>
                  </div>
                  <h3>{module.name}</h3>
                  <p>{module.description}</p>
                  {module.href ? (
                    <Link className="home-card__link" href={module.href}>
                      Open module
                    </Link>
                  ) : (
                    <span className="pms-module-card__unavailable">Not enabled yet</span>
                  )}
                </Card>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}
