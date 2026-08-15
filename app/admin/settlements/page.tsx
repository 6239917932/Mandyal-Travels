import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminSettlementManager } from '@/components/admin/AdminSettlementManager';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Partner settlements' };
export default async function AdminSettlementsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/settlements');
  const [partners, settlements] = await Promise.all([
    prisma.supplyPartner.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      where: { status: 'ACTIVE' },
    }),
    prisma.partnerSettlement.findMany({
      include: { partner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Audited supplier finance</p>
          <h1>Partner settlements</h1>
          <p>
            Calculate captured value, commission, net payables, approvals, and payment references.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/finance">
          Finance operations
        </Link>
      </div>
      <AdminSettlementManager partners={partners} settlements={settlements} />
    </section>
  );
}
