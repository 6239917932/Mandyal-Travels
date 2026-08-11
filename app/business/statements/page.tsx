import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Company statements' };

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function BusinessStatementsPage() {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const organization = await prisma.organization.findUnique({
    include: {
      travelRequests: {
        include: {
          customerTrip: { select: { confirmationCode: true } },
          hotelBooking: { select: { confirmationCode: true } },
          requester: { select: { firstName: true, lastName: true } },
        },
        orderBy: { bookedAt: 'desc' },
        where: { status: 'BOOKED' },
      },
    },
    where: { id: access.membership.organizationId },
  });
  if (!organization) redirect('/business');

  const total = organization.travelRequests.reduce(
    (sum, request) => sum + (request.currency === 'INR' ? (request.bookingTotalAmount ?? 0) : 0),
    0,
  );

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Organization reporting</p>
          <h1>Company booking statements</h1>
          <p>{organization.name}</p>
          {organization.contactEmail ? <p>{organization.contactEmail}</p> : null}
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/business/dashboard">
            Back to business workspace
          </Link>
          <a className="ui-button ui-button--primary" href="/api/v1/business/statements/export">
            Download CSV
          </a>
        </div>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Confirmed company journeys</span>
          <strong>{organization.travelRequests.length}</strong>
        </Card>
        <Card>
          <span>Recorded company value</span>
          <strong>{formatCurrency(total, 'INR')}</strong>
        </Card>
      </div>

      <p className="business-statement__notice">
        These are company booking statements for reporting. They are not statutory GST tax invoices.
      </p>

      <div className="account-trips__list">
        {organization.travelRequests.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No confirmed company journeys yet.</strong>
            <p>Approved company bookings will appear here automatically.</p>
          </Card>
        ) : (
          organization.travelRequests.map((request) => {
            const reference =
              request.customerTrip?.confirmationCode ??
              request.hotelBooking?.confirmationCode ??
              'Pending reference';
            return (
              <Card className="business-statement-row" key={request.id}>
                <div>
                  <span className="account-trip__type">{request.productType}</span>
                  <h2>{request.title}</h2>
                  <p>
                    {request.requester.firstName} {request.requester.lastName} · {reference}
                  </p>
                </div>
                <div>
                  <span>{request.bookedAt?.toLocaleDateString('en-IN') ?? request.startDate}</span>
                  <strong>
                    {formatCurrency(request.bookingTotalAmount ?? 0, request.currency)}
                  </strong>
                  <Link href={`/business/statements/${request.id}`}>View statement</Link>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
