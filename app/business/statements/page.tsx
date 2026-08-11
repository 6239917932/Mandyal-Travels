import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Company statements' };

const PAGE_SIZE = 50;

type BusinessStatementsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function readPage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BusinessStatementsPage({
  searchParams,
}: BusinessStatementsPageProps) {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const organizationId = access.membership.organizationId;
  const values = await searchParams;
  const [organization, totalBookings, totalValue] = await Promise.all([
    prisma.organization.findUnique({
      select: { contactEmail: true, legalName: true, name: true },
      where: { id: organizationId },
    }),
    prisma.businessTravelRequest.count({
      where: { organizationId, status: 'BOOKED' },
    }),
    prisma.businessTravelRequest.aggregate({
      _sum: { bookingTotalAmount: true },
      where: { currency: 'INR', organizationId, status: 'BOOKED' },
    }),
  ]);
  if (!organization) redirect('/business');

  const totalPages = Math.max(1, Math.ceil(totalBookings / PAGE_SIZE));
  const page = Math.min(readPage(values.page), totalPages);
  const travelRequests = await prisma.businessTravelRequest.findMany({
    include: {
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      requester: { select: { firstName: true, lastName: true } },
    },
    orderBy: { bookedAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where: { organizationId, status: 'BOOKED' },
  });

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Organization reporting</p>
          <h1>Company booking statements</h1>
          <p>{organization.legalName ?? organization.name}</p>
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
          <strong>{totalBookings}</strong>
        </Card>
        <Card>
          <span>Recorded company value</span>
          <strong>{formatCurrency(totalValue._sum.bookingTotalAmount ?? 0, 'INR')}</strong>
        </Card>
        <Card>
          <span>Page</span>
          <strong>
            {page} of {totalPages}
          </strong>
        </Card>
      </div>

      <p className="business-statement__notice">
        These are company booking statements for reporting. They are not statutory GST tax invoices.
      </p>

      <div className="account-trips__list">
        {travelRequests.length === 0 ? (
          <Card className="account-trips__empty">
            <strong>No confirmed company journeys yet.</strong>
            <p>Approved company bookings will appear here automatically.</p>
          </Card>
        ) : (
          travelRequests.map((request) => {
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

      {totalPages > 1 ? (
        <nav aria-label="Company statement pages" className="business-audit-pagination">
          {page > 1 ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/statements?page=${page - 1}`}
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/statements?page=${page + 1}`}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
