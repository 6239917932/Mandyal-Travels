import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PrivacyRequestManager } from '@/components/account/PrivacyRequestManager';
import { Card } from '@/components/ui/Card';
import { PartnerPrivacyEvidenceForm } from '@/components/partner/PartnerPrivacyEvidenceForm';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerPrivacyWorkspace } from '@/services/partnerPrivacyWorkspaceService';

export const metadata: Metadata = { title: 'Privacy and data rights | Mandyal PMS' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function PartnerPrivacyPage() {
  const access = await getPartnerAccess();
  if (
    !access?.partnerId ||
    !access.userId ||
    access.mode !== 'user-session' ||
    access.partnerType !== 'HOTEL'
  ) {
    redirect('/partner');
  }
  const workspace = await getPartnerPrivacyWorkspace({
    partnerId: access.partnerId,
    memberRole: access.memberRole,
    userId: access.userId,
  });
  if (!workspace) redirect('/partner');

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Governance · accountable human review</p>
            <h1>Privacy and data rights</h1>
            <p className="booking-page__intro">
              Review consent evidence, download your personal account archive, and submit governed
              access, correction, deletion, or restriction requests.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/legal/privacy">
              Privacy notice
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/access">
              Access control
            </Link>
          </div>
        </header>

        {workspace.propertyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            The managed-property safety limit was reached. Guest registration consent totals are
            incomplete until the portfolio is reviewed.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Account consent records</span>
            <strong>{workspace.consentCount.toLocaleString('en-IN')}</strong>
            <small>Append-only evidence for this signed-in account</small>
          </Card>
          <Card>
            <span>Current marketing posture</span>
            <strong>{workspace.currentMarketingPosture?.label ?? 'No evidence'}</strong>
            <small>No permission is inferred when evidence is absent</small>
          </Card>
          <Card>
            <span>Guest registrations</span>
            <strong>
              {workspace.propertyLimitReached
                ? 'Withheld'
                : `${workspace.guestRegistrationConsent.recorded} / ${workspace.guestRegistrationConsent.total}`}
            </strong>
            <small>Registration records with consent evidence</small>
          </Card>
          <Card>
            <span>Open rights requests</span>
            <strong>
              {
                workspace.privacyRequests.filter((request) =>
                  ['OPEN', 'IN_REVIEW'].includes(request.status),
                ).length
              }
            </strong>
            <small>Human-reviewed account requests</small>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Access and portability</p>
          <h2>Personal account archive</h2>
          <p>
            Download the existing privacy-safe account export. Passwords, session tokens and raw
            payment-card details are excluded. This archive covers the signed-in person; it is not a
            bulk export of every guest or employee record in the partner workspace.
          </p>
          <a className="ui-button ui-button--primary" href="/api/v1/account/export">
            Download my account data
          </a>
        </Card>

        <PrivacyRequestManager initialRequests={workspace.privacyRequests} />

        {access.memberRole === 'ADMIN' ? (
          <Card>
            <p className="hotel-page__eyebrow">Hotel privacy response queue</p>
            <h2>Guest requests connected to managed properties</h2>
            <p>
              Record the hotel’s response evidence for central privacy review. This does not
              automatically erase booking, finance, security, or statutory records.
            </p>
            {workspace.partnerRequests.length ? (
              workspace.partnerRequests.map((request) => (
                <section key={request.id}>
                  <h3>
                    {request.requestType} · {request.name}
                  </h3>
                  <p>
                    {request.email} · {request.status.replaceAll('_', ' ')} · due{' '}
                    {formatDate(request.dueAt)}
                  </p>
                  {request.latestEvidence ? (
                    <p>
                      <strong>Latest hotel evidence:</strong>{' '}
                      {request.latestEvidence.posture.replaceAll('_', ' ')} ·{' '}
                      {request.latestEvidence.note}
                    </p>
                  ) : null}
                  <PartnerPrivacyEvidenceForm requestId={request.id} />
                </section>
              ))
            ) : (
              <p>No open guest privacy requests are connected to this hotel portfolio.</p>
            )}
          </Card>
        ) : null}

        <Card>
          <p className="hotel-page__eyebrow">Consent evidence</p>
          <h2>Recent account consent history</h2>
          {workspace.consentRecords.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Purpose</th>
                    <th scope="col">Status</th>
                    <th scope="col">Recorded</th>
                    <th scope="col">Source</th>
                    <th scope="col">Policy evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.consentRecords.map((record, index) => (
                    <tr key={`${record.recordedAt}-${record.purpose}-${index}`}>
                      <th scope="row">{record.purpose}</th>
                      <td>{record.status.label}</td>
                      <td>{formatDate(record.recordedAt)}</td>
                      <td>{record.source}</td>
                      <td>
                        {record.policy.label}
                        {record.policy.pendingLegalApproval ? ' · draft wording' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No consent evidence is recorded. No permission or withdrawal is inferred.</p>
          )}
          {workspace.consentHistoryLimited ? (
            <p>
              This summary shows the 20 most recent records.{' '}
              <Link href="/account/consents">Open the bounded consent-history workspace</Link> to
              review older evidence.
            </p>
          ) : (
            <Link href="/account/consents">Open complete consent history</Link>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Retention and erasure boundary</p>
          <h2>Requests are reviewed before records change</h2>
          <ul>
            <li>
              Deletion is a governed request, not an immediate destructive action. Identity must be
              verified and legal holds must be checked.
            </li>
            <li>
              Booking, payment, refund, tax, dispute, safety, security and audit records may require
              continued retention under their purpose or applicable law.
            </li>
            <li>
              The published privacy notice does not claim a universal fixed retention period. A
              qualified reviewer decides whether correction, restriction, deletion, or continued
              retention is appropriate for each record class.
            </li>
            <li>
              This workspace does not bulk-delete guest, employee, finance, or compliance records.
            </li>
          </ul>
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Partner responsibility</p>
          <h2>Minimum privacy operating posture</h2>
          <ul>
            <li>Grant guest-data access only to named staff who need it for hotel operations.</li>
            <li>Do not export or reuse guest details for unrelated marketing.</li>
            <li>Report suspected unauthorized access promptly and preserve audit evidence.</li>
            <li>
              Use the governed request workflow when a person asks for access, correction,
              restriction, or deletion.
            </li>
          </ul>
          <Link className="ui-button ui-button--secondary" href="/partner/compliance">
            Open partner compliance
          </Link>
        </Card>
      </div>
    </main>
  );
}
