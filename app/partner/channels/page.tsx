import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ChannelSyncManager } from '@/components/partner/ChannelSyncManager';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Hotel channel synchronization' };

export default async function PartnerChannelsPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partners');
  const [records, properties] = await Promise.all([
    prisma.hotelChannelConnection.findMany({
      include: {
        propertyMappings: { include: { property: { select: { displayName: true } } } },
        syncRuns: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
      where: { partnerId: access.partnerId },
    }),
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      where: { partnerId: access.partnerId, status: 'ACTIVE' },
    }),
  ]);
  const connections = records.map((record) => ({
    ...record,
    createdAt: record.createdAt.toISOString(),
    lastHealthAt: record.lastHealthAt?.toISOString() ?? null,
    syncRuns: record.syncRuns.map((run) => ({
      ...run,
      completedAt: run.completedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      updatedAt: run.updatedAt.toISOString(),
    })),
    updatedAt: record.updatedAt.toISOString(),
    propertyMappings: record.propertyMappings.map((mapping) => ({
      ...mapping,
      createdAt: mapping.createdAt.toISOString(),
      lastSyncedAt: mapping.lastSyncedAt?.toISOString() ?? null,
      updatedAt: mapping.updatedAt.toISOString(),
    })),
  }));
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">PMS and channel distribution</p>
          <h1>Channel synchronization</h1>
          <p>
            Map hotel inventory to external systems, queue audited synchronization, and reconcile
            exceptions.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/partner">
          Partner workspace
        </Link>
      </div>
      <ChannelSyncManager connections={connections} properties={properties} />
    </section>
  );
}
