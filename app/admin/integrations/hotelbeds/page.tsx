import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import {
  hotelbedsContentReadinessLabel,
  parseHotelbedsContentRunSummary,
} from '@/lib/hotel/hotelbedsContentReadiness';
import { inspectHotelbedsConfiguration } from '@/lib/hotel/hotelbedsRules';
import { getHotelbedsContentReadiness } from '@/services/hotelbedsContentReadinessService';

export const metadata: Metadata = { title: 'Hotelbeds integration readiness' };

function formatDate(value: Date | null | undefined): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(value);
}

function runStatusLabel(status: string): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'Succeeded';
    case 'FAILED':
      return 'Failed';
    case 'RUNNING':
      return 'Running';
    default:
      return 'Unknown';
  }
}

export default async function AdminHotelbedsReadinessPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/integrations/hotelbeds');
  const posture = inspectHotelbedsConfiguration(process.env);
  const content = await getHotelbedsContentReadiness();
  const contentSyncEnabled = process.env.HOTELBEDS_CONTENT_SYNC_ENABLED === 'true';
  const nextStep = !posture.configured
    ? 'Store the evaluation API key and secret in the server secret store.'
    : !posture.enabled
      ? 'Enable the connector only in a controlled evaluation environment.'
      : posture.productionBlocked
        ? 'Evaluation credentials are blocked from production as intended.'
        : 'Run the explicit status verification command; no automatic request is made here.';

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected hotel supplier setup</p>
          <h1>Hotelbeds integration readiness</h1>
          <p>
            Review evaluation configuration without exposing credentials, consuming the daily API
            quota, or publishing test inventory to customers.
          </p>
        </div>
        <div className="manage-booking__document-actions">
          <Link className="ui-button ui-button--secondary" href="/admin/integrations">
            Integration registry
          </Link>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Operations console
          </Link>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card>
          <span>Connector</span>
          <strong>{posture.enabled ? 'Enabled' : 'Disabled'}</strong>
        </Card>
        <Card>
          <span>Credential posture</span>
          <strong>{posture.configured ? 'Configured' : 'Missing'}</strong>
        </Card>
        <Card>
          <span>Provider environment</span>
          <strong>{posture.environment}</strong>
        </Card>
        <Card>
          <span>Customer booking</span>
          <strong>Blocked</strong>
        </Card>
      </div>

      <Card>
        <p className="hotel-page__eyebrow">Next controlled step</p>
        <h2>{nextStep}</h2>
        <p>
          Run <code>npm run supplier:verify:hotelbeds</code> from the server after placing the key
          and secret in <code>.env.local</code>. The command makes one signed status request and
          does not search availability or create a booking.
        </p>
      </Card>

      <section className="admin-section-block" aria-labelledby="hotelbeds-boundaries">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Evaluation boundaries</p>
            <h2 id="hotelbeds-boundaries">Certification remains required</h2>
          </div>
        </div>
        <Card>
          <ul>
            <li>Evaluation inventory is never mixed into public hotel results.</li>
            <li>
              No availability, CheckRate, booking, cancellation, or voucher call is automatic.
            </li>
            <li>
              Production requires HBX commercial approval, certification, and live credentials.
            </li>
            <li>API keys and signature secrets remain server-only and are never displayed here.</li>
          </ul>
        </Card>
      </section>

      <section className="admin-section-block" aria-labelledby="hotelbeds-certification">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Certification controls</p>
            <h2 id="hotelbeds-certification">Evaluation workflow is guarded</h2>
          </div>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>Availability</span>
            <strong>Validated</strong>
            <p>One call per workflow, with at most 2,000 unique hotels.</p>
          </Card>
          <Card>
            <span>CheckRate</span>
            <strong>Conditional</strong>
            <p>Called only for RECHECK rates, with at most 10 rates per call.</p>
          </Card>
          <Card>
            <span>Booking and cancel</span>
            <strong>Not wired</strong>
            <p>Chargeable operations remain blocked pending certification approval.</p>
          </Card>
          <Card>
            <span>Content cache</span>
            <strong>
              {content.available
                ? hotelbedsContentReadinessLabel(content.readiness.state)
                : hotelbedsContentReadinessLabel(content.state)}
            </strong>
            <p>
              Scheduled initial and differential sync remains disabled pending approved activation.
            </p>
          </Card>
        </div>
        <Card>
          <h3>Implemented evidence</h3>
          <ul>
            <li>All requested occupancies are grouped into the same availability request.</li>
            <li>Children require explicit ages; invalid dates and malformed values fail closed.</li>
            <li>Requests use signed server-only headers and request gzip-compressed responses.</li>
            <li>Unknown response fields are ignored so additive provider changes remain safe.</li>
            <li>
              Static hotel content is stored only by a bounded scheduled batch; customer searches
              never call the Content API in real time.
            </li>
          </ul>
          <p>
            Review the controlled certification plan in{' '}
            <code>docs/hotelbeds-certification-readiness.md</code> before requesting HBX review.
          </p>
        </Card>
      </section>

      <section className="admin-section-block" aria-labelledby="hotelbeds-content-health">
        <div className="admin-section-block__heading">
          <div>
            <p className="hotel-page__eyebrow">Content-cache observability</p>
            <h2 id="hotelbeds-content-health">Administrator-only sync evidence</h2>
          </div>
        </div>
        <div className="partner-bookings__summary">
          <Card>
            <span>Sync gate</span>
            <strong>{contentSyncEnabled ? 'Enabled' : 'Disabled'}</strong>
            <p>No provider call can run while this gate is disabled.</p>
          </Card>
          <Card>
            <span>Cache health</span>
            <strong>
              {content.available
                ? hotelbedsContentReadinessLabel(content.readiness.state)
                : hotelbedsContentReadinessLabel(content.state)}
            </strong>
            <p>Fresh through 36 hours; overdue after 72 hours.</p>
          </Card>
          <Card>
            <span>Active cached hotels</span>
            <strong>
              {content.available ? content.readiness.activePropertyCount : 'Unavailable'}
            </strong>
            <p>Cached content is never published to customer search automatically.</p>
          </Card>
          <Card>
            <span>Newest content fetch</span>
            <strong>
              {content.available ? formatDate(content.readiness.newestFetchedAt) : 'Unavailable'}
            </strong>
            <p>Shown in India Standard Time.</p>
          </Card>
        </div>

        {!content.available ? (
          <Card>
            <h3>Apply the reviewed database migration</h3>
            <p>
              Content-cache evidence is unavailable in this database. Apply the committed migration
              through the documented deployment process before enabling any evaluation sync. The
              portal remains available and no provider request was attempted.
            </p>
          </Card>
        ) : (
          <Card className="business-report__table-card">
            <h3>Recent bounded runs</h3>
            {content.recentRuns.length === 0 ? (
              <p>No Hotelbeds content-sync run has been recorded.</p>
            ) : (
              <div className="business-report__table-scroll">
                <table className="business-report__table">
                  <thead>
                    <tr>
                      <th scope="col">Started</th>
                      <th scope="col">Status</th>
                      <th scope="col">Mode and progress</th>
                      <th scope="col">Records</th>
                      <th scope="col">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.recentRuns.map((run) => {
                      const summary = parseHotelbedsContentRunSummary(run.summaryJson);
                      return (
                        <tr key={`${run.startedAt.toISOString()}-${run.status}`}>
                          <td>{formatDate(run.startedAt)}</td>
                          <td>{runStatusLabel(run.status)}</td>
                          <td>
                            {summary
                              ? `${summary.mode === 'INITIAL' ? 'Initial' : 'Differential'} · ${summary.pages} page${summary.pages === 1 ? '' : 's'}`
                              : 'No validated summary'}
                          </td>
                          <td>
                            {run.processedCount} processed
                            {run.failureCount > 0 ? ` · ${run.failureCount} failed` : ''}
                          </td>
                          <td>{formatDate(run.completedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </section>
    </section>
  );
}
