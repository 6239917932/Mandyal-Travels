import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Organization servicing record' };

type Props = { params: Promise<{ organizationId: string }> };

function formatCurrency(amount: number | null, currency = 'INR') {
  if (amount === null) return 'No limit';
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function AdminOrganizationDetailPage({ params }: Props) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/organizations');

  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({
    select: {
      approvalRequired: true,
      auditEntries: {
        orderBy: { createdAt: 'desc' },
        select: { action: true, createdAt: true, summary: true },
        take: 20,
      },
      billingAddress: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
      defaultCabinClass: true,
      id: true,
      legalName: true,
      maximumTripAmount: true,
      members: {
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          role: true,
          user: { select: { email: true, firstName: true, id: true, lastName: true } },
        },
        take: 50,
      },
      name: true,
      policyVersions: {
        orderBy: { version: 'desc' },
        select: {
          approvalRequired: true,
          createdAt: true,
          defaultCabinClass: true,
          maximumTripAmount: true,
          version: true,
        },
        take: 20,
      },
      supportCases: {
        orderBy: { updatedAt: 'desc' },
        select: { caseNumber: true, category: true, status: true, subject: true, updatedAt: true },
        take: 20,
      },
      taxRegistrationId: true,
      travelRequests: {
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          currency: true,
          estimatedAmount: true,
          id: true,
          productType: true,
          requester: { select: { email: true, firstName: true, id: true, lastName: true } },
          startDate: true,
          status: true,
          title: true,
        },
        take: 20,
      },
      type: true,
      updatedAt: true,
    },
    where: { id: organizationId },
  });
  if (!organization) notFound();

  const [memberCount, openRequests, openSupport, policyVersionCount] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId: organization.id } }),
    prisma.businessTravelRequest.count({
      where: { organizationId: organization.id, status: 'PENDING' },
    }),
    prisma.businessSupportCase.count({
      where: { organizationId: organization.id, status: 'OPEN' },
    }),
    prisma.organizationPolicyVersion.count({ where: { organizationId: organization.id } }),
  ]);

  return (
    <section className="account-page business-report admin-record-page admin-workspace">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Authorized organization servicing</p>
          <h1>{organization.name}</h1>
          <p>{organization.legalName ?? organization.type}</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/organizations">
          Back to organization directory
        </Link>
      </div>

      <div className="admin-record-summary">
        <Card>
          <span>Team members</span>
          <strong>{memberCount}</strong>
        </Card>
        <Card>
          <span>Pending requests</span>
          <strong>{openRequests}</strong>
        </Card>
        <Card>
          <span>Open support</span>
          <strong>{openSupport}</strong>
        </Card>
        <Card>
          <span>Saved policy history</span>
          <strong>{policyVersionCount}</strong>
        </Card>
      </div>

      <div className="admin-record-grid">
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Organization profile</p>
          <dl className="admin-record-list">
            <div>
              <dt>Type</dt>
              <dd>{organization.type}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {organization.contactEmail ?? 'No email recorded'}
                <br />
                {organization.contactPhone ?? 'No phone recorded'}
              </dd>
            </div>
            <div>
              <dt>Billing address</dt>
              <dd>{organization.billingAddress ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Tax registration</dt>
              <dd>{organization.taxRegistrationId ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(organization.createdAt)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(organization.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Current travel policy</p>
          <dl className="admin-record-list">
            <div>
              <dt>Booking approval</dt>
              <dd>{organization.approvalRequired ? 'Required' : 'Automatic'}</dd>
            </div>
            <div>
              <dt>Default flight cabin</dt>
              <dd>{organization.defaultCabinClass}</dd>
            </div>
            <div>
              <dt>Maximum trip amount</dt>
              <dd>{formatCurrency(organization.maximumTripAmount)}</dd>
            </div>
          </dl>
          {organization.policyVersions[0] ? (
            <p className="admin-empty-state">
              Latest saved policy: version {organization.policyVersions[0].version},{' '}
              {formatDate(organization.policyVersions[0].createdAt)}
            </p>
          ) : (
            <p className="admin-empty-state">No versioned policy history has been recorded.</p>
          )}
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Organization access</p>
          <h2>Team directory</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {organization.members.map((member) => (
                  <tr key={member.user.id}>
                    <td>
                      <Link
                        className="admin-directory-link"
                        href={`/admin/users/${member.user.id}`}
                      >
                        {member.user.firstName} {member.user.lastName}
                      </Link>
                      <span>{member.user.email}</span>
                    </td>
                    <td>
                      <strong>{member.role}</strong>
                    </td>
                    <td>{formatDate(member.createdAt)}</td>
                  </tr>
                ))}
                {organization.members.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No team members are connected to this organization.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Company travel</p>
          <h2>Recent requests</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Journey</th>
                  <th>Traveller</th>
                  <th>Policy state</th>
                  <th>Estimated value</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {organization.travelRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.title}</strong>
                      <span>
                        {request.productType} · {request.startDate}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="admin-directory-link"
                        href={`/admin/users/${request.requester.id}`}
                      >
                        {request.requester.firstName} {request.requester.lastName}
                      </Link>
                      <span>{request.requester.email}</span>
                    </td>
                    <td>
                      <strong>{request.status}</strong>
                    </td>
                    <td>{formatCurrency(request.estimatedAmount, request.currency)}</td>
                    <td>{formatDate(request.createdAt)}</td>
                  </tr>
                ))}
                {organization.travelRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No company travel requests have been recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="admin-record-grid">
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Support history</p>
          {organization.supportCases.length ? (
            organization.supportCases.map((supportCase) => (
              <div className="admin-record-item" key={supportCase.caseNumber}>
                <strong>
                  {supportCase.caseNumber} · {supportCase.subject}
                </strong>
                <span>
                  {supportCase.category} · {supportCase.status}
                </span>
                <small>Updated {formatDate(supportCase.updatedAt)}</small>
              </div>
            ))
          ) : (
            <p className="admin-empty-state">No company support cases have been recorded.</p>
          )}
        </Card>
        <Card className="admin-record-card">
          <p className="hotel-page__eyebrow">Recent audit trail</p>
          {organization.auditEntries.length ? (
            organization.auditEntries.map((entry, index) => (
              <div className="admin-record-item" key={`${entry.createdAt.toISOString()}-${index}`}>
                <strong>{entry.summary}</strong>
                <span>{entry.action.replaceAll('_', ' ')}</span>
                <small>{formatDate(entry.createdAt)}</small>
              </div>
            ))
          ) : (
            <p className="admin-empty-state">No organization audit events have been recorded.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
