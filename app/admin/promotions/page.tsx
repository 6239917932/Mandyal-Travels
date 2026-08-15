import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  AdminPromotionCreateForm,
  AdminPromotionStatus,
} from '@/components/admin/AdminPromotionManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Promotion operations' };

function date(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

export default async function AdminPromotionsPage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/promotions');
  const campaigns = await prisma.promotionCampaign.findMany({ orderBy: { updatedAt: 'desc' } });
  const now = new Date();

  return (
    <section className="account-page platform-admin-page">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Versioned commercial rules</p>
          <h1>Promotions and coupon campaigns</h1>
          <p>
            Create bounded campaigns in a paused state, review their dates and products, then
            activate them deliberately.
          </p>
          <Link className="ui-button ui-button--secondary" href="/admin">
            Back to operations
          </Link>
        </div>
      </header>

      <Card>
        <h2>Create campaign</h2>
        <AdminPromotionCreateForm />
      </Card>

      <div className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Commercial catalogue</p>
          <h2>Governed campaigns</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Products</th>
                  <th>Rule</th>
                  <th>Window</th>
                  <th>State</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const scheduledState =
                    campaign.startsAt > now
                      ? 'SCHEDULED'
                      : campaign.endsAt < now
                        ? 'EXPIRED'
                        : campaign.active
                          ? 'ACTIVE'
                          : 'PAUSED';
                  return (
                    <tr key={campaign.id}>
                      <td>
                        <strong>{campaign.code}</strong>
                        <span>{campaign.name}</span>
                        <span>Version {campaign.version}</span>
                      </td>
                      <td>
                        {campaign.productsJson.replaceAll(/[\[\]"]/g, '').replaceAll(',', ', ')}
                      </td>
                      <td>
                        <strong>{campaign.percentOff}% off</strong>
                        <span>
                          Minimum {campaign.minimumSubtotal}; cap {campaign.maximumDiscount}
                        </span>
                        <span>
                          {campaign.usageLimit
                            ? `${campaign.usageLimit} uses maximum`
                            : 'No usage cap configured'}
                        </span>
                      </td>
                      <td>
                        <strong>{date(campaign.startsAt)}</strong>
                        <span>to {date(campaign.endsAt)}</span>
                      </td>
                      <td>
                        <strong>{scheduledState}</strong>
                      </td>
                      <td>
                        <AdminPromotionStatus active={campaign.active} campaignId={campaign.id} />
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      No database-backed campaigns created. Existing baseline codes remain available
                      until replaced.
                    </td>
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
