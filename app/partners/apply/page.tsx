import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PartnerApplicationForm } from '@/components/partner/PartnerApplicationForm';
import { PartnerOnboardingCheckout } from '@/components/partner/PartnerOnboardingCheckout';
import { FeatureUnavailable } from '@/components/common/FeatureUnavailable';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';
import { summarizePersistedPartnerKyc } from '@/lib/partner/kycPersistenceRules';
import { PARTNER_ONBOARDING_PRICE } from '@/lib/partner/onboardingCommercialRules';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Partner onboarding',
};

export default async function PartnerApplicationPage() {
  if (!(await isPlatformFeatureEnabled('PARTNER_APPLICATIONS'))) {
    return (
      <FeatureUnavailable
        description="New supplier applications are paused while the onboarding queue is reviewed."
        title="Partner applications are paused"
      />
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partners/apply');
  const application = await prisma.partnerApplication.findFirst({
    include: { kycDocuments: true },
    orderBy: { createdAt: 'desc' },
    where: { applicantUserId: user.id },
  });
  const membership = await prisma.supplyPartnerMember.findUnique({
    include: { partner: true },
    where: { userId: user.id },
  });
  const paidOnboardingEnabled = await isPlatformFeatureEnabled('PAID_PARTNER_ONBOARDING');
  const enrollment = paidOnboardingEnabled
    ? await prisma.partnerOnboardingOrder.findFirst({
        include: {
          agreementAcceptance: {
            include: {
              agreementVersion: { include: { release: true } },
              phoneVerification: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        where: { status: { in: ['CAPTURED', 'WAIVED'] }, userId: user.id },
      })
    : null;
  const agreement = enrollment?.agreementAcceptance?.agreementVersion;
  const phone = enrollment?.agreementAcceptance?.phoneVerification;
  const enrollmentComplete = Boolean(
    enrollment?.completedAt &&
    enrollment.agreementAcceptance &&
    enrollment.agreementAcceptance.contentHash === agreement?.contentHash &&
    agreement?.status === 'APPROVED' &&
    agreement.release?.key === 'SUPPLIER_ONBOARDING' &&
    agreement.effectiveAt &&
    agreement.effectiveAt <= new Date() &&
    phone?.status === 'VERIFIED' &&
    phone.verifiedAt &&
    phone.expiresAt > new Date(),
  );

  if (membership) redirect('/partner');
  const kycSummary =
    application &&
    (application.partnerType === 'BUS' ||
      application.partnerType === 'CAR' ||
      application.partnerType === 'HOTEL')
      ? summarizePersistedPartnerKyc({
          documents: application.kycDocuments,
          partnerType: application.partnerType,
          today: new Date().toISOString().slice(0, 10),
        })
      : null;
  return (
    <section className="auth-page partner-application">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Verified supplier network</p>
        <h1>Apply to sell travel inventory.</h1>
        <p>
          Tell us about your hotel or car fleet. Access is activated only after a platform
          administrator reviews the business.
        </p>
        <Card>
          <p className="hotel-page__eyebrow">Supplier software plan</p>
          <h2>
            ₹{(PARTNER_ONBOARDING_PRICE.oneTimeSetupAmount / 100).toLocaleString('en-IN')} setup + ₹
            {(PARTNER_ONBOARDING_PRICE.monthlySubscriptionAmount / 100).toLocaleString('en-IN')}
            /month
          </h2>
          <p>
            Approved launch coupons can waive the first amount, including reducing it to ₹0. A
            coupon never bypasses identity, agreement, tax, safety, or listing review.
          </p>
          <small>
            Recurring billing starts only after a separate mandate and consent. Payment enrollment
            remains disabled until PayU reconciliation, phone OTP, and the final counsel-approved
            agreement are active.
          </small>
        </Card>
      </div>
      {paidOnboardingEnabled && !enrollment ? (
        <PartnerOnboardingCheckout />
      ) : paidOnboardingEnabled && !enrollmentComplete ? (
        <Card className="partner-application__status">
          <span className="business-request__status business-request__status--pending">
            Payment recorded
          </span>
          <h2>Phone verification and agreement are next.</h2>
          <p>
            Your payment or launch waiver is recorded. Application entry remains locked until a
            current phone OTP is verified and the approved supplier agreement is accepted.
          </p>
          <small>
            Mandyal Travels will enable this step only after the OTP provider and final
            counsel-approved agreement are configured. Payment alone never activates a supplier.
          </small>
        </Card>
      ) : application?.status === 'PENDING' ? (
        <Card className="partner-application__status">
          <span className="business-request__status business-request__status--pending">
            Verification pending
          </span>
          <h2>{application.businessName}</h2>
          <p>
            Your {application.partnerType.toLowerCase()} supplier request is in the review queue. No
            inventory access has been granted yet.
          </p>
          {kycSummary ? (
            <>
              <p>
                <strong>
                  Compliance evidence: {kycSummary.verified.length} of {kycSummary.required.length}{' '}
                  verified
                </strong>
              </p>
              <p>
                {kycSummary.complete
                  ? 'Your required evidence is current.'
                  : `Still required: ${kycSummary.missing.join(', ').replaceAll('_', ' ') || 'expired evidence replacement'}.`}
              </p>
              <small>
                Private upload storage and malware scanning are not activated. No file can be safely
                accepted yet.
              </small>
            </>
          ) : null}
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
