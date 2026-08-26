import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import {
  getPartnerKycChecklist,
  PartnerKycGovernanceError,
} from '@/services/partnerKycGovernanceService';

export const metadata: Metadata = { title: 'Supplier compliance' };

export default async function PartnerCompliancePage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.mode !== 'user-session')
    redirect('/login?returnTo=/partner/compliance');
  let checklist;
  try {
    checklist = await getPartnerKycChecklist(access.partnerId);
  } catch (error) {
    return (
      <section className="account-page partner-workspace">
        <Card>
          <p className="hotel-page__eyebrow">Supplier compliance</p>
          <h1>Evidence record unavailable</h1>
          <p>
            {error instanceof PartnerKycGovernanceError
              ? error.message
              : 'The compliance record could not be loaded.'}
          </p>
          <Link className="ui-button ui-button--secondary" href="/partner">
            Return to workspace
          </Link>
        </Card>
      </section>
    );
  }
  return (
    <section className="account-page partner-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Private supplier evidence</p>
          <h1>Compliance checklist</h1>
          <p>Review status and expiry only. Identity evidence is never publicly downloadable.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/partner">
          Partner workspace
        </Link>
      </header>
      <div className="partner-bookings__summary">
        <Card>
          <span>Required</span>
          <strong>{checklist.summary.required.length}</strong>
        </Card>
        <Card>
          <span>Verified</span>
          <strong>{checklist.summary.verified.length}</strong>
        </Card>
        <Card>
          <span>Needs attention</span>
          <strong>{checklist.summary.missing.length + checklist.summary.expired.length}</strong>
        </Card>
      </div>
      <Card>
        <h2>{checklist.summary.complete ? 'Evidence is current' : 'Evidence is incomplete'}</h2>
        <p>
          Private upload storage and malware scanning are not activated yet. The portal will not
          accept or expose files until those controls are available.
        </p>
        {checklist.documents.length ? (
          checklist.documents.map((document) => (
            <p key={document.documentType}>
              <strong>{document.documentType.replaceAll('_', ' ')}</strong> ·{' '}
              {document.status.replaceAll('_', ' ')}
              {document.expiresOn ? ` · expires ${document.expiresOn}` : ''}
              <br />
              <small>{document.originalFilename ?? 'No verified file metadata'}</small>
            </p>
          ))
        ) : (
          <p>No governed evidence has been stored.</p>
        )}
      </Card>
    </section>
  );
}
