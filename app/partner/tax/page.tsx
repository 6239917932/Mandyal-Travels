import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { MARKETPLACE_TAX_RULE } from '@/lib/finance/marketplaceTax';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Tax and settlement tracker' };

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerTaxPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId) redirect('/partners');
  const [partner, totals, recent] = await Promise.all([
    prisma.supplyPartner.findUnique({
      include: { taxProfile: true },
      where: { id: access.partnerId },
    }),
    prisma.marketplaceTaxSnapshot.aggregate({
      _sum: {
        customerTaxableAmount: true,
        gstTcsAmount: true,
        incomeTaxTdsAmount: true,
        serviceGstAmount: true,
        vendorBaseAmount: true,
        vendorSettlementAmount: true,
      },
      where: { partnerId: access.partnerId },
    }),
    prisma.marketplaceTaxSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      where: { partnerId: access.partnerId },
    }),
  ]);
  if (!partner) redirect('/partners');
  const sum = totals._sum;
  const vendorOutputGst =
    partner.taxProfile?.gstRegistrationStatus === 'REGISTERED' ? (sum.serviceGstAmount ?? 0) : 0;
  const estimatedCashGstBeforeItc = Math.max(0, vendorOutputGst - (sum.gstTcsAmount ?? 0));

  return (
    <section className="account-page partner-workspace">
      <div className="account-page__container">
        <header className="account-trips__heading">
          <p className="hotel-page__eyebrow">Transparent supplier accounting</p>
          <h1>Tax and settlement tracker</h1>
          <p>
            Booking snapshots use {MARKETPLACE_TAX_RULE.version}. Values never replace your GST
            portal, books, input-credit records, or off-platform sales.
          </p>
          <Link className="ui-button ui-button--secondary" href="/partner">
            Partner workspace
          </Link>
        </header>

        <Card>
          <h2>Tax profile</h2>
          <p>
            Status: <strong>{partner.taxProfile?.reviewStatus ?? 'Not reviewed'}</strong>
            <br />
            GST classification:{' '}
            <strong>{partner.taxProfile?.gstRegistrationStatus ?? 'Pending'}</strong>
            <br />
            Commission: <strong>{(partner.commissionBasisPoints / 100).toFixed(2)}%</strong>,
            inclusive of commission GST and standard payment processing under the commercial policy.
          </p>
        </Card>

        <div className="partner-inventory__metrics">
          <Card>
            <span>Vendor base sold</span>
            <strong>{money(sum.vendorBaseAmount ?? 0)}</strong>
          </Card>
          <Card>
            <span>Service GST recorded</span>
            <strong>{money(sum.serviceGstAmount ?? 0)}</strong>
          </Card>
          <Card>
            <span>GST TCS credit</span>
            <strong>{money(sum.gstTcsAmount ?? 0)}</strong>
          </Card>
          <Card>
            <span>Section 194-O TDS credit</span>
            <strong>{money(sum.incomeTaxTdsAmount ?? 0)}</strong>
          </Card>
          <Card>
            <span>Estimated GST cash before ITC</span>
            <strong>{money(estimatedCashGstBeforeItc)}</strong>
          </Card>
          <Card>
            <span>Net settlement recorded</span>
            <strong>{money(sum.vendorSettlementAmount ?? 0)}</strong>
          </Card>
        </div>

        <Card>
          <h2>Recent booking tax statements</h2>
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer taxable</th>
                  <th>GST</th>
                  <th>TCS / TDS</th>
                  <th>Settlement</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>{snapshot.createdAt.toLocaleDateString('en-IN')}</td>
                    <td>{money(snapshot.customerTaxableAmount)}</td>
                    <td>{money(snapshot.serviceGstAmount)}</td>
                    <td>
                      {money(snapshot.gstTcsAmount)} / {money(snapshot.incomeTaxTdsAmount)}
                    </td>
                    <td>
                      <strong>{money(snapshot.vendorSettlementAmount)}</strong>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No live marketplace booking snapshots exist yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
