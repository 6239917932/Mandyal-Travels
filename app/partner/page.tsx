import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { hotelBookingService } from '@/services/hotelBookingService';
import { partnerOperationsService } from '@/services/partnerOperationsService';

export const metadata: Metadata = { title: 'Partner workspace' };

function money(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function PartnerWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner');

  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId) redirect('/partners');
  if (access.partnerType === 'BUS') redirect('/partner/bus-operations');
  if (access.partnerType === 'FLIGHT') redirect('/partner/flights');

  const [partner, bookingSummary, pendingAmendments] = await Promise.all([
    prisma.supplyPartner.findUnique({
      include: {
        auditEntries: {
          include: { actor: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        properties: {
          include: { rooms: { where: { status: 'ACTIVE' } } },
          orderBy: { displayName: 'asc' },
          where: { status: 'ACTIVE' },
        },
        vehicles: {
          include: {
            inventoryDays: {
              where: { serviceDate: { gte: new Date().toISOString().slice(0, 10) } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      where: { id: access.partnerId },
    }),
    access.partnerType === 'HOTEL'
      ? hotelBookingService.getPartnerBookingSummary({ hotelSlugs: access.allowedHotelSlugs })
      : partnerOperationsService.getVehicleReservationSummary(access.partnerId),
    access.partnerType === 'HOTEL'
      ? hotelBookingService.getPendingAmendmentCount(access.allowedHotelSlugs)
      : Promise.resolve(0),
  ]);
  if (!partner) redirect('/partners');

  return (
    <section className="account-page partner-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Secure supplier workspace</p>
          <h1>{partner.name}</h1>
          <p>
            Welcome, {user.firstName}. Manage only the inventory assigned to this verified supplier
            account.
          </p>
          <div className="admin-hero__actions">
            <Link
              className="ui-button ui-button--primary"
              href={partner.type === 'CAR' ? '/partner/reservations' : '/partner/bookings'}
            >
              {partner.type === 'CAR' ? 'Open reservations' : 'Open bookings'}
            </Link>
            <Link
              className="ui-button ui-button--secondary"
              href={partner.type === 'CAR' ? '/cars' : '/partner/properties'}
            >
              {partner.type === 'CAR' ? 'View live car search' : 'Manage properties'}
            </Link>
            {partner.type === 'HOTEL' || partner.type === 'CAR' ? (
              <Link className="ui-button ui-button--secondary" href="/partner/reports">
                Performance reports
              </Link>
            ) : null}
            <Link className="ui-button ui-button--secondary" href="/partner/compliance">
              Compliance evidence
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/tax">
              Tax and settlement tracker
            </Link>
            <form action="/api/v1/auth/logout" method="post">
              <button className="admin-hero__signout" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">{partner.type} supply partner</span>
          <strong>
            {pendingAmendments
              ? `${pendingAmendments} amendments need review`
              : 'Operations are clear'}
          </strong>
          <span>
            {partner.type === 'CAR'
              ? `${partner.vehicles.length} fleet records`
              : `${partner.properties.length} assigned properties`}
          </span>
          <span>Access is restricted to named partner accounts.</span>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>{partner.type === 'CAR' ? 'Fleet records' : 'Assigned properties'}</span>
          <strong>
            {partner.type === 'CAR' ? partner.vehicles.length : partner.properties.length}
          </strong>
        </Card>
        <Card>
          <span>{partner.type === 'CAR' ? 'Reservations' : 'Total bookings'}</span>
          <strong>{bookingSummary.totalCount}</strong>
        </Card>
        <Card>
          <span>{partner.type === 'CAR' ? 'Confirmed rentals' : 'Confirmed stays'}</span>
          <strong>{bookingSummary.confirmedCount}</strong>
        </Card>
        <Card>
          <span>Captured value</span>
          <strong>{money(bookingSummary.capturedInrValue)}</strong>
        </Card>
        <Card>
          <span>Pending amendments</span>
          <strong>{pendingAmendments}</strong>
        </Card>
      </div>

      {partner.type === 'HOTEL' ? (
        <div className="partner-workspace__links">
          <Card>
            <p className="hotel-page__eyebrow">Property setup</p>
            <h2>Rooms and rates</h2>
            <p>Create properties, room types, opening rates, policies, and public listings.</p>
            <Link className="home-card__link" href="/partner/properties">
              Manage properties
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Reservations</p>
            <h2>Booking operations</h2>
            <p>Review guests, stay dates, allocation, booking state, and payment status.</p>
            <Link className="home-card__link" href="/partner/bookings">
              Open booking dashboard
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Availability</p>
            <h2>Room inventory</h2>
            <p>Monitor allocations and apply an audited stop-sell or inventory limit.</p>
            <Link className="home-card__link" href="/partner/inventory">
              Open inventory dashboard
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Guest changes</p>
            <h2>Amendment queue</h2>
            <p>Approve or decline date-change requests after availability and price checks.</p>
            <Link className="home-card__link" href="/partner/amendments">
              Review amendments
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Distribution</p>
            <h2>PMS and channel sync</h2>
            <p>Connect provider accounts, map properties, and reconcile synchronization runs.</p>
            <Link className="home-card__link" href="/partner/channels">
              Manage channels
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Guest feedback</p>
            <h2>Reviews and responses</h2>
            <p>Read published verified-stay reviews and post an audited property response.</p>
            <Link className="home-card__link" href="/partner/reviews">
              Manage reviews
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Supplier finance</p>
            <h2>Settlement statements</h2>
            <p>Review captured value, commission, net payable, approvals, and payment status.</p>
            <Link className="home-card__link" href="/partner/settlements">
              View settlements
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Room operations</p>
            <h2>Housekeeping board</h2>
            <p>Coordinate dirty, cleaning, ready, and out-of-service rooms with front desk.</p>
            <Link className="home-card__link" href="/partner/housekeeping">
              Open housekeeping
            </Link>
          </Card>
        </div>
      ) : (
        <div className="partner-workspace__links">
          <Card>
            <p className="hotel-page__eyebrow">Reservations</p>
            <h2>Rental operations</h2>
            <p>Review confirmed drivers, routes, rental dates, vehicle assignment, and value.</p>
            <Link className="home-card__link" href="/partner/reservations">
              Open reservations
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Vehicles</p>
            <h2>Fleet catalogue</h2>
            <p>Add vehicles and operating routes with commercial terms and capacity.</p>
            <Link className="home-card__link" href="/partner/fleet">
              Manage fleet
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Yield and availability</p>
            <h2>Daily fleet calendar</h2>
            <p>Override daily rates, available units, and stop-sales for maintenance.</p>
            <Link className="home-card__link" href="/partner/fleet">
              Open calendar
            </Link>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Distribution</p>
            <h2>Live customer channel</h2>
            <p>Review how active, available direct fleet offers appear to customers.</p>
            <Link className="home-card__link" href="/cars">
              View car search
            </Link>
          </Card>
        </div>
      )}

      <div className="partner-workspace__columns">
        <section>
          <p className="hotel-page__eyebrow">Property scope</p>
          <h2>{partner.type === 'CAR' ? 'Published fleet' : 'Hotel catalogue'}</h2>
          <div className="partner-workspace__properties">
            {partner.type === 'HOTEL'
              ? partner.properties.map((property) => (
                  <Card key={property.id}>
                    <strong>{property.displayName}</strong>
                    <span>{property.hotelSlug}</span>
                    <small>
                      {property.rooms.length} room types ·{' '}
                      {property.publicationStatus.toLowerCase()}
                    </small>
                  </Card>
                ))
              : partner.vehicles.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <strong>{vehicle.vehicleName}</strong>
                    <span>
                      {vehicle.pickupLocation} → {vehicle.dropoffLocation}
                    </span>
                    <small>
                      {vehicle.totalUnits} units · ₹{vehicle.pricePerDay.toLocaleString('en-IN')} /
                      day
                    </small>
                  </Card>
                ))}
            {partner.properties.length === 0 && partner.vehicles.length === 0 ? (
              <Card>
                <strong>No inventory has been published.</strong>
                {partner.type === 'HOTEL' ? (
                  <Link className="home-card__link" href="/partner/properties">
                    Create the first property
                  </Link>
                ) : null}
              </Card>
            ) : null}
          </div>
        </section>
        <section>
          <p className="hotel-page__eyebrow">Accountability</p>
          <h2>Recent partner activity</h2>
          <Link className="home-card__link" href="/partner/activity">
            View complete activity log
          </Link>
          <Card className="partner-workspace__audit">
            {partner.auditEntries.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.summary}</strong>
                <span>
                  {entry.actor
                    ? `${entry.actor.firstName} ${entry.actor.lastName}`
                    : 'Platform integration'}{' '}
                  · {formatDate(entry.createdAt)}
                </span>
              </div>
            ))}
            {partner.auditEntries.length === 0 ? (
              <p>No partner activity has been recorded.</p>
            ) : null}
          </Card>
        </section>
      </div>
    </section>
  );
}
