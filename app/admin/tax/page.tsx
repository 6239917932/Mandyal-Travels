import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminTaxProfileForm } from '@/components/admin/AdminTaxProfileForm';
import { Card } from '@/components/ui/Card';
import { MARKETPLACE_TAX_RULE } from '@/lib/finance/marketplaceTax';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Marketplace tax control' };

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function AdminTaxPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/tax');
  const [partners, totals] = await Promise.all([
    prisma.supplyPartner.findMany({
      include: { taxProfile: true },
      orderBy: { createdAt: 'desc' },
      where: { type: 'HOTEL' },
    }),
    prisma.marketplaceTaxSnapshot.aggregate({
      _sum: {
        commissionGstAmount: true,
        commissionTaxableAmount: true,
        ecoGstLiabilityAmount: true,
        gatewayFeeGstAmount: true,
        gstTcsAmount: true,
        incomeTaxTdsAmount: true,
        vendorSettlementAmount: true,
      },
    }),
  ]);
  const sum = totals._sum;
  const estimatedPlatformGst = Math.max(
    0,
    (sum.commissionGstAmount ?? 0) +
      (sum.ecoGstLiabilityAmount ?? 0) -
      (sum.gatewayFeeGstAmount ?? 0),
  );

  return (
    <section className="account-page platform-admin-page">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Controlled marketplace accounting</p>
          <h1>Tax, commission, and settlement control</h1>
          <p>
            Review tax identity before publication and monitor immutable booking calculations under{' '}
            {MARKETPLACE_TAX_RULE.version}.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Operations console
          </Link>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">20% all-inclusive commission</span>
          <strong>Live payments remain separately gated</strong>
          <span>No tax rate can be entered by a supplier.</span>
          <span>All totals are estimates until returns and input credits are reconciled.</span>
        </div>
      </header>

      <div className="admin-overview-grid">
        <Card className="admin-metric admin-metric--primary">
          <span>Commission before GST</span>
          <strong>{money(sum.commissionTaxableAmount ?? 0)}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Estimated platform GST</span>
          <strong>{money(estimatedPlatformGst)}</strong>
          <small>Commission GST + Section 9(5) GST − recorded gateway GST credit</small>
        </Card>
        <Card className="admin-metric">
          <span>GST TCS for partner credit</span>
          <strong>{money(sum.gstTcsAmount ?? 0)}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Section 194-O TDS</span>
          <strong>{money(sum.incomeTaxTdsAmount ?? 0)}</strong>
        </Card>
        <Card className="admin-metric">
          <span>Vendor settlements</span>
          <strong>{money(sum.vendorSettlementAmount ?? 0)}</strong>
        </Card>
      </div>

      <section>
        <p className="hotel-page__eyebrow">Activation gate</p>
        <h2>Hotel supplier tax profiles</h2>
        <p>
          A verified profile is necessary but not sufficient for publication: contract, listing,
          compliance, payment-provider, and platform feature approvals remain separate controls.
        </p>
        <div className="supplier-admin__grid">
          {partners.map((partner) => (
            <Card key={partner.id}>
              <span className="admin-status-badge">
                {partner.taxProfile?.reviewStatus ?? 'NOT REVIEWED'}
              </span>
              <h3>{partner.name}</h3>
              <p>
                Commission: {(partner.commissionBasisPoints / 100).toFixed(2)}%
                <br />
                GST: {partner.taxProfile?.gstRegistrationStatus ?? 'Pending classification'}
                <br />
                State code: {partner.taxProfile?.placeOfSupplyStateCode || 'Not recorded'}
              </p>
              <AdminTaxProfileForm partnerId={partner.id} profile={partner.taxProfile} />
            </Card>
          ))}
          {partners.length === 0 ? <Card>No hotel supplier accounts exist yet.</Card> : null}
        </div>
      </section>
    </section>
  );
}
