import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PrintDocumentButton } from '@/components/booking/PrintDocumentButton';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Company travel request' };

type PolicySnapshot = {
  approvalRequired?: boolean;
  defaultCabinClass?: string;
  maximumTripAmount?: number | null;
  version?: number | null;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function parsePolicySnapshot(value: string): PolicySnapshot {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as PolicySnapshot) : {};
  } catch {
    return {};
  }
}

function activityLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase();
}

export default async function BusinessTravelRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = await prisma.organizationMember.findUnique({
    select: { organizationId: true, role: true },
    where: { userId: user.id },
  });
  if (!membership) redirect('/business');

  const { requestId } = await params;
  const request = await prisma.businessTravelRequest.findFirst({
    include: {
      agencyCustomerLink: { include: { agencyCustomer: true } },
      customerTrip: { select: { confirmationCode: true } },
      hotelBooking: { select: { confirmationCode: true } },
      organization: { select: { name: true, type: true } },
      policyVersion: { select: { version: true } },
      requester: { select: { email: true, firstName: true, lastName: true } },
      reviewedBy: { select: { email: true, firstName: true, lastName: true } },
    },
    where: { id: requestId, organizationId: membership.organizationId },
  });
  if (!request || (membership.role !== 'ADMIN' && request.requesterId !== user.id)) notFound();

  const auditEntries = await prisma.businessAuditLog.findMany({
    include: { actor: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
    where: {
      entityId: request.id,
      entityType: 'TRAVEL_REQUEST',
      organizationId: membership.organizationId,
    },
  });
  const snapshot = parsePolicySnapshot(request.policySnapshotJson);
  const policyVersion = request.policyVersion?.version ?? snapshot.version ?? null;
  const bookingReference =
    request.customerTrip?.confirmationCode ?? request.hotelBooking?.confirmationCode ?? null;
  const isAgencyRequest = Boolean(request.agencyCustomerLink);
  const backHref =
    membership.role === 'ADMIN'
      ? request.organization.type === 'TRAVEL_AGENCY'
        ? '/agent'
        : '/business/dashboard'
      : '/account#company-travel-request';

  return (
    <section className="account-page business-request-record">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Company travel record</p>
          <h1>{request.title}</h1>
          <p>{request.organization.name}</p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href={backHref}>
            Back to{' '}
            {membership.role === 'ADMIN'
              ? request.organization.type === 'TRAVEL_AGENCY'
                ? 'agent workspace'
                : 'business workspace'
              : 'my account'}
          </Link>
          {request.status === 'BOOKED' && membership.role === 'ADMIN' ? (
            <Link
              className="ui-button ui-button--secondary"
              href={`/business/statements/${request.id}`}
            >
              View company statement
            </Link>
          ) : null}
          <PrintDocumentButton label="Print or save request record" />
        </div>
      </div>

      <div className="partner-bookings__summary">
        <Card>
          <span>Status</span>
          <strong
            className={`business-request__status business-request__status--${request.status.toLowerCase()}`}
          >
            {request.status}
          </strong>
        </Card>
        <Card>
          <span>Product</span>
          <strong>{request.productType}</strong>
        </Card>
        <Card>
          <span>Estimated amount</span>
          <strong>{formatCurrency(request.estimatedAmount, request.currency)}</strong>
        </Card>
        <Card>
          <span>Request reference</span>
          <strong>{request.id}</strong>
        </Card>
      </div>

      <Card>
        <div className="business-request-record__details">
          <div>
            <span>{isAgencyRequest ? 'Agency customer' : 'Traveller'}</span>
            <strong>
              {request.agencyCustomerLink?.agencyCustomer.displayName ??
                `${request.requester.firstName} ${request.requester.lastName}`}
            </strong>
            <small>
              {request.agencyCustomerLink?.agencyCustomer.email ?? request.requester.email}
            </small>
            {request.agencyCustomerLink?.agencyCustomer.phone ? (
              <small>{request.agencyCustomerLink.agencyCustomer.phone}</small>
            ) : null}
          </div>
          <div>
            <span>Travel dates</span>
            <strong>
              {request.startDate}
              {request.endDate ? ` to ${request.endDate}` : ''}
            </strong>
          </div>
          <div>
            <span>Requested on</span>
            <strong>{request.createdAt.toLocaleDateString('en-IN')}</strong>
            <small>{request.createdAt.toLocaleTimeString('en-IN')}</small>
          </div>
          <div>
            <span>Booking reference</span>
            <strong>{bookingReference ?? 'Not booked'}</strong>
          </div>
          <div>
            <span>Final booked amount</span>
            <strong>
              {request.bookingTotalAmount === null
                ? 'Not booked'
                : formatCurrency(request.bookingTotalAmount, request.currency)}
            </strong>
          </div>
          <div>
            <span>Booked on</span>
            <strong>{request.bookedAt?.toLocaleDateString('en-IN') ?? 'Not booked'}</strong>
          </div>
        </div>
      </Card>

      <div className="business-request-record__columns">
        <Card>
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Policy snapshot</p>
            <h2>Rules applied when requested</h2>
          </div>
          <dl className="business-request-record__list">
            <div>
              <dt>Policy version</dt>
              <dd>{policyVersion === null ? 'Legacy policy' : `Version ${policyVersion}`}</dd>
            </div>
            <div>
              <dt>Approval rule</dt>
              <dd>
                {snapshot.approvalRequired === false
                  ? 'Automatic approval allowed'
                  : 'Administrator approval required'}
              </dd>
            </div>
            <div>
              <dt>Default flight cabin</dt>
              <dd>{snapshot.defaultCabinClass?.replaceAll('_', ' ') ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Maximum trip amount</dt>
              <dd>
                {typeof snapshot.maximumTripAmount === 'number'
                  ? formatCurrency(snapshot.maximumTripAmount, request.currency)
                  : 'No limit recorded'}
              </dd>
            </div>
          </dl>
          <p className="booking-confirmation__note">{request.policyReason}</p>
        </Card>

        <Card>
          <div className="account-trips__heading">
            <p className="hotel-page__eyebrow">Approval decision</p>
            <h2>Review outcome</h2>
          </div>
          <dl className="business-request-record__list">
            <div>
              <dt>Decision</dt>
              <dd>{request.status === 'PENDING' ? 'Awaiting review' : request.status}</dd>
            </div>
            <div>
              <dt>Reviewed by</dt>
              <dd>
                {request.reviewedBy
                  ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`
                  : request.status === 'APPROVED' || request.status === 'BOOKED'
                    ? 'Automatically approved by policy'
                    : 'Not reviewed'}
              </dd>
            </div>
            <div>
              <dt>Reviewed on</dt>
              <dd>{request.reviewedAt?.toLocaleString('en-IN') ?? 'Not reviewed'}</dd>
            </div>
            <div>
              <dt>Decision note</dt>
              <dd>{request.reviewNote || 'No decision note'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Record history</p>
          <h2>Request audit trail</h2>
        </div>
        {auditEntries.length === 0 ? (
          <p className="booking-confirmation__note">No activity has been recorded yet.</p>
        ) : (
          <ol className="business-audit__list">
            {auditEntries.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{activityLabel(entry.action)}</strong>
                  <span>{entry.summary}</span>
                </div>
                <div>
                  <strong>
                    {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'}
                  </strong>
                  <time dateTime={entry.createdAt.toISOString()}>
                    {entry.createdAt.toLocaleString('en-IN')}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
