import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { getBusinessAdminMembership } from '@/lib/businessAuth';
import { prisma } from '@/lib/prisma';

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function CompanyStatementPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const access = await getBusinessAdminMembership();
  if (!access) redirect('/business');

  const { requestId } = await params;
  const request = await prisma.businessTravelRequest.findFirst({
    include: {
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      organization: {
        select: {
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          legalName: true,
          name: true,
          taxRegistrationId: true,
        },
      },
      requester: { select: { email: true, firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    where: {
      id: requestId,
      organizationId: access.membership.organizationId,
      status: 'BOOKED',
    },
  });
  if (!request) notFound();

  const reference =
    request.customerTrip?.confirmationCode ?? request.hotelBooking?.confirmationCode ?? '—';

  return (
    <div className="booking-document-page">
      <div className="booking-document-actions">
        <Link href="/business/statements">Back to company statements</Link>
        <PrintDocumentButton label="Print or save statement" />
      </div>
      <article className="booking-document">
        <header className="booking-document__header">
          <div>
            <span className="booking-document__brand">Mandyal Travels for Business</span>
            <h1>Company booking statement</h1>
          </div>
          <div className="booking-document__status">
            <span>Booking reference</span>
            <strong>{reference}</strong>
          </div>
        </header>

        <section className="booking-document__section business-statement__parties">
          <div>
            <h2>Organization</h2>
            <p>{request.organization.legalName ?? request.organization.name}</p>
            {request.organization.legalName &&
            request.organization.legalName !== request.organization.name ? (
              <p>Trading as {request.organization.name}</p>
            ) : null}
            {request.organization.billingAddress ? (
              <p style={{ whiteSpace: 'pre-line' }}>{request.organization.billingAddress}</p>
            ) : null}
            {request.organization.taxRegistrationId ? (
              <p>GSTIN: {request.organization.taxRegistrationId}</p>
            ) : null}
            {request.organization.contactEmail ? <p>{request.organization.contactEmail}</p> : null}
            {request.organization.contactPhone ? <p>{request.organization.contactPhone}</p> : null}
          </div>
          <div>
            <h2>Traveller</h2>
            <p>
              {request.requester.firstName} {request.requester.lastName}
            </p>
            <p>{request.requester.email}</p>
          </div>
        </section>

        <section className="booking-document__section">
          <h2>Journey</h2>
          <div className="booking-document__reference">
            <div>
              <span>Product</span>
              <strong>{request.productType}</strong>
            </div>
            <div>
              <span>Purpose or destination</span>
              <strong>{request.title}</strong>
            </div>
            <div>
              <span>Travel dates</span>
              <strong>
                {request.startDate}
                {request.endDate ? ` to ${request.endDate}` : ''}
              </strong>
            </div>
          </div>
        </section>

        <section className="booking-document__section">
          <h2>Recorded charge</h2>
          <div className="booking-document__charges">
            <div>
              <span>Confirmed company booking</span>
              <strong>{formatCurrency(request.bookingTotalAmount ?? 0, request.currency)}</strong>
            </div>
            <div className="booking-document__charges-total">
              <span>Total recorded</span>
              <strong>{formatCurrency(request.bookingTotalAmount ?? 0, request.currency)}</strong>
            </div>
          </div>
        </section>

        <section className="booking-document__reference">
          <div>
            <span>Approval status</span>
            <strong>APPROVED AND BOOKED</strong>
          </div>
          <div>
            <span>Reviewed by</span>
            <strong>
              {request.reviewedBy
                ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`
                : 'Automatically approved by policy'}
            </strong>
          </div>
          <div>
            <span>Booked on</span>
            <strong>{request.bookedAt?.toLocaleDateString('en-IN') ?? '—'}</strong>
          </div>
        </section>

        <footer className="booking-document__footer">
          This document is an organization booking statement for internal reporting, not a statutory
          GST tax invoice. Tax registration, tax components, commission, and settlement rules will
          be added only after the approved finance configuration is available.
        </footer>
      </article>
    </div>
  );
}
