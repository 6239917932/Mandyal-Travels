import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PartnerApplicationForm } from '@/components/partner/PartnerApplicationForm';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Partner onboarding' };

export default async function PartnerApplicationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partners/apply');
  const application = await prisma.partnerApplication.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { applicantUserId: user.id },
  });
  const membership = await prisma.supplyPartnerMember.findUnique({
    include: { partner: true },
    where: { userId: user.id },
  });

  if (membership) redirect('/partner');
  return (
    <section className="auth-page partner-application">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Verified supplier network</p>
        <h1>Apply to sell travel inventory.</h1>
        <p>
          Tell us about your hotel or car fleet. Access is activated only after a platform
          administrator reviews the business.
        </p>
      </div>
      {application?.status === 'PENDING' ? (
        <Card className="partner-application__status">
          <span className="business-request__status business-request__status--pending">
            Verification pending
          </span>
          <h2>{application.businessName}</h2>
          <p>
            Your {application.partnerType.toLowerCase()} supplier request is in the review queue. No
            inventory access has been granted yet.
          </p>
          <Link className="ui-button ui-button--secondary" href="/partners">
            Back to partner network
          </Link>
        </Card>
      ) : (
        <PartnerApplicationForm
          defaultEmail={user.email}
          defaultName={`${user.firstName} ${user.lastName}`}
        />
      )}
    </section>
  );
}
