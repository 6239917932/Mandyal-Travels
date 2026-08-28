import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { inspectHotelbedsConfiguration } from '@/lib/hotel/hotelbedsRules';

export const metadata: Metadata = { title: 'Hotelbeds integration readiness' };

export default async function AdminHotelbedsReadinessPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/integrations/hotelbeds');
  const posture = inspectHotelbedsConfiguration(process.env);
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
            <strong>Pending</strong>
            <p>Requires an approved content-data store and scheduled differential refresh.</p>
          </Card>
        </div>
        <Card>
          <h3>Implemented evidence</h3>
          <ul>
            <li>All requested occupancies are grouped into the same availability request.</li>
            <li>Children require explicit ages; invalid dates and malformed values fail closed.</li>
            <li>Requests use signed server-only headers and request gzip-compressed responses.</li>
            <li>Unknown response fields are ignored so additive provider changes remain safe.</li>
          </ul>
          <p>
            Review the controlled certification plan in{' '}
            <code>docs/hotelbeds-certification-readiness.md</code> before requesting HBX review.
          </p>
        </Card>
      </section>
    </section>
  );
}
