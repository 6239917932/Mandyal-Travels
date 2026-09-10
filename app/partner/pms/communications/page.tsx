import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerCommunicationOperations } from '@/services/partnerCommunicationOperationsService';

export const metadata: Metadata = { title: 'Email and WhatsApp operations | Mandyal PMS' };

function dateTime(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not recorded';
}

function statusTone(status: string) {
  return status === 'DELIVERED' || status === 'SUCCEEDED' ? 'approved' : 'pending';
}

export default async function PartnerCommunicationsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerCommunicationOperations(access.partnerId);
  const activeEmailTemplates = workspace.templates.filter(
    (template) => template.channel === 'EMAIL' && template.status === 'ACTIVE',
  ).length;
  const activeWhatsappTemplates = workspace.templates.filter(
    (template) => template.channel === 'WHATSAPP' && template.status === 'ACTIVE',
  ).length;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Guest experience · consent-aware delivery</p>
            <h1>Email and WhatsApp operations</h1>
            <p className="booking-page__intro">
              Review the real delivery queue, consent eligibility, active templates, and worker
              evidence for this partner. This page does not create campaigns or claim delivery
              without provider acknowledgement.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/activity">
              Activity log
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              PMS dashboard
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Audience safety limit reached. Counts are bounded; use platform administration for a
            full retained-data review.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Registered audience</span>
            <strong>{workspace.audience.registered}</strong>
          </Card>
          <Card>
            <span>Email eligible</span>
            <strong>{workspace.audience.emailEligible}</strong>
          </Card>
          <Card>
            <span>WhatsApp opted in</span>
            <strong>{workspace.audience.whatsappEligible}</strong>
          </Card>
          <Card>
            <span>7-day delivery rate</span>
            <strong>
              {workspace.sevenDayDeliveryRate === null
                ? 'No attempts'
                : `${workspace.sevenDayDeliveryRate}%`}
            </strong>
          </Card>
        </div>

        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">Transactional email</p>
            <h2>
              {workspace.provider.emailReady ? 'Provider configured' : 'Provider not configured'}
            </h2>
            <p>
              {activeEmailTemplates} active email template{activeEmailTemplates === 1 ? '' : 's'}.
              Email is marked delivered only after the configured SMTP or API provider returns an
              acknowledgement.
            </p>
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">WhatsApp</p>
            <h2>
              {workspace.provider.whatsappReady
                ? 'Approved provider configured'
                : 'Provider connection not active'}
            </h2>
            <p>
              {activeWhatsappTemplates} active WhatsApp template
              {activeWhatsappTemplates === 1 ? '' : 's'}. Opt-in alone never represents delivery; an
              allowed provider endpoint, sender, API credential, and acknowledgement are required.
            </p>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Automation worker</p>
          <h2>Latest notification delivery run</h2>
          {workspace.workerRun ? (
            <div className="account-trip__topline">
              <div>
                <strong>{workspace.workerRun.status.toLowerCase().replaceAll('_', ' ')}</strong>
                <p>
                  Started {dateTime(workspace.workerRun.startedAt)} · Completed{' '}
                  {dateTime(workspace.workerRun.completedAt)}
                </p>
                <p>
                  Processed {workspace.workerRun.processedCount} · Failures{' '}
                  {workspace.workerRun.failureCount}
                </p>
              </div>
              <span
                className={`partner-status partner-status--${statusTone(workspace.workerRun.status)}`}
              >
                Recorded run
              </span>
            </div>
          ) : (
            <p>No notification automation run has been recorded.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Template governance</p>
          <h2>Email and WhatsApp templates</h2>
          {workspace.templates.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Template</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Version</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.templates.map((template) => (
                    <tr key={`${template.channel}-${template.templateKey}`}>
                      <th scope="row">{template.templateKey}</th>
                      <td>{template.channel}</td>
                      <td>{template.version}</td>
                      <td>{template.status.toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No email or WhatsApp templates have been registered.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Partner-scoped evidence</p>
          <h2>Recent delivery records</h2>
          {workspace.deliveries.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Created</th>
                    <th scope="col">Template</th>
                    <th scope="col">Private recipient</th>
                    <th scope="col">Status</th>
                    <th scope="col">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.deliveries.map((delivery, index) => (
                    <tr
                      key={`${delivery.createdAt.toISOString()}-${delivery.recipientReference}-${index}`}
                    >
                      <td>{dateTime(delivery.createdAt)}</td>
                      <th scope="row">
                        {delivery.templateKey}
                        <small>{delivery.channel}</small>
                      </th>
                      <td>{delivery.recipientReference}</td>
                      <td>
                        <span
                          className={`partner-status partner-status--${statusTone(delivery.status)}`}
                        >
                          {delivery.status.toLowerCase().replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td>
                        Provider acknowledgement:{' '}
                        {delivery.providerAcknowledgementRecorded ? 'recorded' : 'none'}
                        <small>
                          Attempts {delivery.attempts} · Error evidence{' '}
                          {delivery.errorEvidenceRecorded ? 'recorded' : 'none'} · Delivered{' '}
                          {dateTime(delivery.deliveredAt)}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No partner-scoped email or WhatsApp delivery records are available.</p>
          )}
        </Card>

        <Card>
          <p>
            Automated messages remain event driven through the existing notification queue. Manual
            bulk messaging is intentionally unavailable here. Guests can change consent from their
            account, and platform administrators govern template activation and retry operations.
          </p>
        </Card>
      </div>
    </main>
  );
}
