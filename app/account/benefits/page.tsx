import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_BENEFITS_LAUNCH_NOTICE,
  CUSTOMER_BENEFITS_LEDGER_LIMIT,
  customerBenefitsAccountWhere,
  customerBenefitsReferralWhere,
  formatRecordedWalletUnits,
  formatSignedBenefitsUnits,
  publicReferralReadiness,
} from '@/services/customerBenefitsService';

export const metadata: Metadata = { title: 'Benefits readiness' };

export default async function CustomerBenefitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fbenefits');
  if (user.role !== 'CUSTOMER') redirect('/account');

  const [account, referral] = await Promise.all([
    prisma.loyaltyAccount.findUnique({
      select: {
        entries: {
          orderBy: { createdAt: 'desc' },
          select: {
            createdAt: true,
            entryType: true,
            pointsDelta: true,
            walletCurrency: true,
            walletDelta: true,
          },
          take: CUSTOMER_BENEFITS_LEDGER_LIMIT,
        },
        pointsBalance: true,
        walletBalance: true,
        walletCurrency: true,
      },
      where: customerBenefitsAccountWhere(user.id),
    }),
    prisma.referralCode.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { expiresAt: true },
      where: customerBenefitsReferralWhere(user.id),
    }),
  ]);

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Customer programme readiness</p>
          <h1>Mandyal Benefits</h1>
          <p>Review records connected only to your signed-in account.</p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>

      <Card className="account-trips__empty" role="status">
        <strong>Programme not launched</strong>
        <p>{CUSTOMER_BENEFITS_LAUNCH_NOTICE}</p>
        <p>
          Any values below are read-only system records. They are not cash, credit, a payment
          method, or a promise of future value.
        </p>
      </Card>

      <div className="partner-bookings__summary" aria-label="Recorded benefit balances">
        <Card>
          <span>Recorded points (not redeemable)</span>
          <strong>{account?.pointsBalance.toLocaleString('en-IN') ?? '0'}</strong>
        </Card>
        <Card>
          <span>Recorded wallet units (programme inactive)</span>
          <strong>
            {account
              ? formatRecordedWalletUnits(account.walletBalance, account.walletCurrency)
              : formatRecordedWalletUnits(0, 'INR')}
          </strong>
        </Card>
        <Card>
          <span>Programme access</span>
          <strong>Unavailable</strong>
        </Card>
      </div>

      <section className="account-trips" aria-labelledby="referral-readiness-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Referral readiness</p>
          <h2 id="referral-readiness-heading">No referral action is available</h2>
        </div>
        <Card className="account-trips__empty">
          <strong>{publicReferralReadiness(referral)}</strong>
          <p>
            Referral codes, invitations, usage limits, and rewards are withheld until eligibility,
            self-referral, fraud, expiry, tax, and support rules are approved.
          </p>
        </Card>
      </section>

      <section className="account-trips" aria-labelledby="benefits-history-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Read-only record</p>
          <h2 id="benefits-history-heading">Recent ledger activity</h2>
          <p>Up to the latest {CUSTOMER_BENEFITS_LEDGER_LIMIT} entries are shown.</p>
        </div>
        {account?.entries.length ? (
          <div className="account-trips__list">
            {account.entries.map((entry, index) => (
              <Card
                className="account-trip"
                key={`${entry.createdAt.toISOString()}-${entry.entryType}-${index}`}
              >
                <div className="account-trip__topline">
                  <strong>{entry.entryType.replaceAll('_', ' ')}</strong>
                  <time dateTime={entry.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(entry.createdAt)}
                  </time>
                </div>
                <dl>
                  <div>
                    <dt>Points record</dt>
                    <dd>{formatSignedBenefitsUnits(entry.pointsDelta, 'points')}</dd>
                  </div>
                  <div>
                    <dt>Wallet record</dt>
                    <dd>{formatSignedBenefitsUnits(entry.walletDelta, 'wallet')}</dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>{entry.walletCurrency}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="account-trips__empty">
            <strong>No benefits activity recorded.</strong>
            <p>No account or ledger entry was created by opening this page.</p>
          </Card>
        )}
      </section>

      <section className="account-trips" aria-labelledby="launch-controls-heading">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Launch governance</p>
          <h2 id="launch-controls-heading">Controls required before activation</h2>
        </div>
        <Card className="account-trips__empty">
          <p>
            Mandyal Travels must approve earning and expiry rules, refund reversals, liability and
            reconciliation treatment, fraud controls, wallet legal requirements, customer
            statements, tax treatment, and support procedures before enabling this programme.
          </p>
          <Link className="ui-button ui-button--secondary" href="/account/support">
            Contact customer support
          </Link>
        </Card>
      </section>
    </section>
  );
}
