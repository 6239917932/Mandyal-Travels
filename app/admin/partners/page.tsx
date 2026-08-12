import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminPartnerReview } from '@/components/admin/AdminPartnerReview';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Supplier administration' };

export default async function AdminPartnersPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/partners');
  const [applications, partners] = await Promise.all([
    prisma.partnerApplication.findMany({
      include: { applicant: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
      where: { status: 'PENDING' },
    }),
    prisma.supplyPartner.findMany({
      include: { _count: { select: { members: true, properties: true, vehicles: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return (
    <section className="account-page supplier-admin">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Platform administration</p>
          <h1>Supplier control center</h1>
          <p>
            Verify businesses, activate named accounts, and monitor hotel and car inventory access.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Operations console
        </Link>
      </div>
      <div className="partner-bookings__summary">
        <Card>
          <span>Pending verification</span>
          <strong>{applications.length}</strong>
        </Card>
        <Card>
          <span>Active suppliers</span>
          <strong>{partners.filter((p) => p.status === 'ACTIVE').length}</strong>
        </Card>
        <Card>
          <span>Hotel suppliers</span>
          <strong>{partners.filter((p) => p.type === 'HOTEL').length}</strong>
        </Card>
        <Card>
          <span>Car suppliers</span>
          <strong>{partners.filter((p) => p.type === 'CAR').length}</strong>
        </Card>
      </div>
      <section>
        <p className="hotel-page__eyebrow">Verification queue</p>
        <h2>Pending applications</h2>
        <div className="supplier-admin__grid">
          {applications.map((item) => (
            <Card key={item.id}>
              <div className="booking-confirmation__reference">
                <span>
                  {item.partnerType} · {item.city}
                </span>
                <strong>{item.businessName}</strong>
              </div>
              <p>
                <strong>{item.contactName}</strong>
                <br />
                {item.contactEmail} · {item.contactPhone}
              </p>
              <p>{item.inventorySummary}</p>
              <small>
                Account: {item.applicant.firstName} {item.applicant.lastName} (
                {item.applicant.email})
              </small>
              <AdminPartnerReview applicationId={item.id} />
            </Card>
          ))}
          {applications.length === 0 ? (
            <Card>No supplier applications are awaiting verification.</Card>
          ) : null}
        </div>
      </section>
      <section>
        <p className="hotel-page__eyebrow">Supplier directory</p>
        <h2>Approved supplier accounts</h2>
        <div className="supplier-admin__grid">
          {partners.map((partner) => (
            <Card key={partner.id}>
              <span
                className={`business-request__status business-request__status--${partner.status.toLowerCase()}`}
              >
                {partner.status}
              </span>
              <h3>{partner.name}</h3>
              <p>
                {partner.type} · {partner._count.members} users · {partner._count.properties}{' '}
                properties · {partner._count.vehicles} vehicles
              </p>
              <Link className="home-card__link" href={`/admin/partners/${partner.id}`}>
                Open supplier record
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
