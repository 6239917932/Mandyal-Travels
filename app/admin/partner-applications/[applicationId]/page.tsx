import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminPartnerReview } from '@/components/admin/AdminPartnerReview';
import { AdminPartnerKycReview } from '@/components/admin/AdminPartnerKycReview';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { summarizePersistedPartnerKyc } from '@/lib/partner/kycPersistenceRules';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Review supplier application' };

export default async function AdminPartnerApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/partner-applications');
  const { applicationId } = await params;
  const item = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: { select: { email: true, emailVerifiedAt: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
      kycDocuments: {
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        orderBy: { documentType: 'asc' },
      },
      kycDocumentEvents: {
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!item) notFound();
  const summary =
    item.partnerType === 'HOTEL' || item.partnerType === 'CAR' || item.partnerType === 'BUS'
      ? summarizePersistedPartnerKyc({
          documents: item.kycDocuments,
          partnerType: item.partnerType,
          today: new Date().toISOString().slice(0, 10),
        })
      : null;
  return (
    <section className="account-page admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">
            {item.partnerType} application · {item.status}
          </p>
          <h1>{item.businessName}</h1>
          <p>
            Submitted {item.createdAt.toLocaleString('en-IN')} · {item.city}
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/partner-applications">
          All applications
        </Link>
      </header>
      <Card>
        <h2>Business and applicant</h2>
        <dl>
          <dt>Legal business name</dt>
          <dd>{item.legalBusinessName || 'Not provided'}</dd>
          <dt>Registered address</dt>
          <dd>{item.registeredAddress || 'Not provided'}</dd>
          <dt>Registration / tax identifier</dt>
          <dd>
            {item.registrationId || 'Not provided'} / {item.taxIdentifier || 'Not provided'}
          </dd>
          <dt>Representative</dt>
          <dd>
            {item.contactName} · {item.identityType.replaceAll('_', ' ')} · {item.identityReference}
          </dd>
          <dt>Contact</dt>
          <dd>
            <a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a> · {item.contactPhone}
          </dd>
          <dt>Applicant account</dt>
          <dd>
            {item.applicant.email} ·{' '}
            {item.applicant.emailVerifiedAt ? 'Email verified' : 'Email not verified'}
          </dd>
        </dl>
        <p style={{ whiteSpace: 'pre-wrap' }}>{item.inventorySummary}</p>
        {item.partnerId ? (
          <Link href={`/admin/partners/${item.partnerId}`}>Open supplier account</Link>
        ) : null}
      </Card>
      <Card>
        <h2>Identity evidence</h2>
        <p>
          {summary?.verified.length ?? 0} of {summary?.required.length ?? 0} required document types
          verified. KYC: {item.kycStatus.replaceAll('_', ' ')}.
        </p>
        <p>
          Evidence downloads remain disabled until private object storage, malware scanning and
          audited signed reads are activated. Do not verify a document based on its filename alone.
        </p>
        {item.kycDocuments.map((document) => (
          <div key={document.id}>
            <h3>{document.documentType.replaceAll('_', ' ')}</h3>
            <p>
              {document.status.replaceAll('_', ' ')} ·{' '}
              {document.versions[0]?.originalFilename ?? 'No file metadata'} · Storage:{' '}
              {document.versions[0]?.storageStatus ?? 'Not uploaded'}
              {document.expiresOn ? ` · Expires ${document.expiresOn}` : ''}
            </p>
            {document.reviewNote ? <p>{document.reviewNote}</p> : null}
            {item.status === 'PENDING' ? (
              <AdminPartnerKycReview
                documentId={document.id}
                lockVersion={document.lockVersion}
                status={document.status}
              />
            ) : null}
          </div>
        ))}
        {!item.kycDocuments.length ? (
          <p>No governed identity documents have been submitted. Approval remains locked.</p>
        ) : null}
      </Card>
      <Card>
        <h2>Agreement and decision</h2>
        <p>
          Agreement version: {item.agreementVersion || 'Not assigned'} · Email:{' '}
          {item.agreementEmailStatus.replaceAll('_', ' ')} · Signed return:{' '}
          {item.signedAgreementStatus.replaceAll('_', ' ')}
        </p>
        {item.agreementDocumentPath ? (
          <a href={item.agreementDocumentPath} rel="noreferrer" target="_blank">
            Open issued agreement
          </a>
        ) : null}
        {item.signedAgreementNote ? <p>{item.signedAgreementNote}</p> : null}
        {item.status === 'PENDING' ? (
          <AdminPartnerReview
            applicationId={item.id}
            approvalAllowed={
              summary?.complete === true && item.signedAgreementStatus === 'RECEIVED'
            }
            agreementVersion={item.agreementVersion}
            agreementEmailStatus={item.agreementEmailStatus}
            signedAgreementStatus={item.signedAgreementStatus}
          />
        ) : (
          <>
            <p>
              <strong>Decision: {item.status}</strong> · {item.reviewedAt?.toLocaleString('en-IN')}
              {item.reviewedBy ? ` · ${item.reviewedBy.firstName} ${item.reviewedBy.lastName}` : ''}
            </p>
            <p>{item.reviewNote || 'No review note recorded.'}</p>
          </>
        )}
      </Card>
      <Card>
        <h2>Recent evidence history</h2>
        {item.kycDocumentEvents.length ? (
          <ol>
            {item.kycDocumentEvents.map((event) => (
              <li key={event.id}>
                <p>
                  <strong>{event.action.replaceAll('_', ' ')}</strong> ·{' '}
                  {event.createdAt.toLocaleString('en-IN')} ·{' '}
                  {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : 'System'}
                </p>
                <p>
                  {event.fromStatus} → {event.toStatus} · {event.reason}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p>No evidence review events recorded.</p>
        )}
      </Card>
    </section>
  );
}
