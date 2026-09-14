import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { OperationalDocumentSettings } from '@/components/partner/OperationalDocumentSettings';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerOperationalDocumentWorkspace } from '@/services/partnerOperationalDocumentService';

export const metadata: Metadata = { title: 'Operational documents | Mandyal PMS' };

export default async function PartnerOperationalDocumentsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerOperationalDocumentWorkspace(access.partnerId);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Property settings · controlled presentation</p>
            <h1>Operational documents</h1>
            <p className="booking-page__intro">
              Give each hotel booking voucher and operating document a consistent, professional
              property identity without changing the underlying reservation or financial evidence.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/properties">
              Property settings
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Billing and cashier
            </Link>
          </div>
        </header>

        <Card>
          <h2>Protected document boundary</h2>
          <p>
            Layout and guest-facing messages are configurable. Mandyal booking references, payment
            evidence, statutory warnings, tax calculations, and invoice identifiers remain system
            controlled and cannot be overridden here.
          </p>
        </Card>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Property safety limit reached. Contact the platform administrator before changing a
            document profile.
          </p>
        ) : null}
        {workspace.properties.length ? (
          <OperationalDocumentSettings
            canManage={access.memberRole === 'ADMIN' && !workspace.safetyLimitReached}
            properties={[...workspace.properties]}
          />
        ) : (
          <Card>
            <h2>No active managed property</h2>
            <p>Create a hotel property before configuring operational documents.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Add property
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
