import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPolicyDocument, POLICY_KINDS, type PolicyKind } from '@/lib/legal/policies';

interface LegalPolicyPageProps {
  params: Promise<{ policy: string }>;
}

export function generateStaticParams(): Array<{ policy: PolicyKind }> {
  return POLICY_KINDS.map((policy) => ({ policy }));
}

export async function generateMetadata({ params }: LegalPolicyPageProps): Promise<Metadata> {
  const { policy } = await params;
  const document = getPolicyDocument(policy);

  if (!document) {
    return { title: 'Policy not found' };
  }

  return {
    title: document.title,
    description: document.summary,
  };
}

export default async function LegalPolicyPage({ params }: LegalPolicyPageProps) {
  const { policy } = await params;
  const document = getPolicyDocument(policy);

  if (!document) {
    notFound();
  }

  return (
    <main className="legal-page legal-document-page">
      <section className="legal-document-header">
        <Link className="legal-back-link" href="/legal">
          ← Legal and policy center
        </Link>
        <p className="legal-eyebrow">VERSIONED OPERATING NOTICE</p>
        <h1>{document.title}</h1>
        <p>{document.summary}</p>
        <div className="legal-document-meta">
          <span className="legal-status">Operational draft</span>
          <span>Version {document.version}</span>
          <span>Updated {document.lastUpdated}</span>
        </div>
      </section>

      <section className="legal-document-body">
        <div className="legal-draft-notice" role="note">
          This notice is an operational draft pending final legal or commercial approval. It
          explains current platform handling but is not legal advice.
        </div>
        {document.sections.map((section) => (
          <section className="legal-policy-section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </section>
    </main>
  );
}
