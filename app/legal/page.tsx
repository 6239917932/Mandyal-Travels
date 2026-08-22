import type { Metadata } from 'next';
import Link from 'next/link';
import { POLICY_DOCUMENTS } from '@/lib/legal/policies';

export const metadata: Metadata = {
  title: 'Legal and policy center | Mandyal Travels',
  description:
    'Versioned operating notices for privacy, platform use, cancellations, refunds, and browser storage.',
};

export default function LegalPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="legal-eyebrow">TRUST, CLARITY, AND ACCOUNTABILITY</p>
        <h1>Legal and policy center</h1>
        <p>
          Review the versioned operating notices that support Mandyal Travels accounts, bookings,
          communications, and supplier services.
        </p>
        <div className="legal-draft-notice" role="note">
          These operational drafts are published for product transparency and remain subject to
          final legal and commercial approval. They are not legal advice.
        </div>
      </section>

      <section className="legal-content" aria-labelledby="policy-list-title">
        <p className="legal-eyebrow">CURRENT NOTICES</p>
        <h2 id="policy-list-title">Choose a policy to review.</h2>
        <div className="legal-card-grid">
          {POLICY_DOCUMENTS.map((policy, index) => (
            <article className="legal-card" key={policy.kind}>
              <span className="legal-card-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="legal-card-heading">
                <h3>{policy.title}</h3>
                <span className="legal-status">Operational draft</span>
              </div>
              <p>{policy.summary}</p>
              <p className="legal-version">
                Version {policy.version} · Updated {policy.lastUpdated}
              </p>
              <Link className="legal-link" href={`/legal/${policy.kind}`}>
                Read notice <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
