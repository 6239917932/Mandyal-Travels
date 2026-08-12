import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';
import { hotelBookingService } from '@/services/hotelBookingService';

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

  const [partner, bookingSummary, pendingAmendments] = await Promise.all([
    prisma.supplyPartner.findUnique({
      include: {
        auditEntries: {
          include: { actor: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        properties: { orderBy: { displayName: 'asc' }, where: { status: 'ACTIVE' } },
      },
      where: { id: access.partnerId },
    }),
    hotelBookingService.getPartnerBookingSummary(access.allowedHotelSlugs),
    hotelBookingService.getPendingAmendmentCount(access.allowedHotelSlugs),
  ]);
  if (!partner) redirect('/partners');

  return (
    <section className="account-page partner-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Secure supplier workspace</p>
          <h1>{partner.name}</h1>
          <p>
            Welcome, {user.firstName}. Manage only the properties assigned to this supplier account.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--primary" href="/partner/bookings">
              Open bookings
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Manage inventory
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
          <span>{partner.properties.length} assigned properties</span>
          <span>Access is restricted to named partner accounts.</span>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>Assigned properties</span>
          <strong>{partner.properties.length}</strong>
        </Card>
        <Card>
          <span>Total bookings</span>
          <strong>{bookingSummary.totalCount}</strong>
        </Card>
        <Card>
          <span>Confirmed stays</span>
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

      <div className="partner-workspace__links">
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
      </div>

      <div className="partner-workspace__columns">
        <section>
          <p className="hotel-page__eyebrow">Property scope</p>
          <h2>Assigned hotels</h2>
          <div className="partner-workspace__properties">
            {partner.properties.map((property) => (
              <Card key={property.id}>
                <strong>{property.displayName}</strong>
                <span>{property.hotelSlug}</span>
                <small>Active inventory access</small>
              </Card>
            ))}
            {partner.properties.length === 0 ? <Card>No properties are assigned.</Card> : null}
          </div>
        </section>
        <section>
          <p className="hotel-page__eyebrow">Accountability</p>
          <h2>Recent partner activity</h2>
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
