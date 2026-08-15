import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Settlement statements' };
function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(amount);
}
export default async function PartnerSettlementsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId) redirect('/partners');
  const settlements = await prisma.partnerSettlement.findMany({
    orderBy: { periodEnd: 'desc' },
    where: { partnerId: access.partnerId },
  });
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Supplier finance</p>
          <h1>Settlement statements</h1>
          <p>
            Review period totals, platform commission, net payable amounts, approval, and payment
            status.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/partner">
          Partner workspace
        </Link>
      </div>
      <div className="supplier-admin__grid">
        {settlements.map((settlement) => (
          <Card key={settlement.id}>
            <span className="admin-status-badge">{settlement.status}</span>
            <h2>
              {settlement.periodStart} – {settlement.periodEnd}
            </h2>
            <p>
              {settlement.bookingCount} bookings
              <br />
              Gross: {money(settlement.grossAmount, settlement.currency)}
              <br />
              Commission: {money(settlement.commissionAmount, settlement.currency)}
              <br />
              <strong>Net: {money(settlement.netAmount, settlement.currency)}</strong>
            </p>
            {settlement.paymentReference ? (
              <small>Payment reference: {settlement.paymentReference}</small>
            ) : null}
          </Card>
        ))}
        {settlements.length === 0 ? (
          <Card>No settlement statements have been issued yet.</Card>
        ) : null}
      </div>
    </section>
  );
}
