import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminNotificationManager } from '@/components/admin/AdminNotificationManager';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
export const metadata: Metadata = { title: 'Notification operations' };
export default async function AdminNotificationsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/notifications');
  const [templates, deliveries] = await Promise.all([
    prisma.notificationTemplate.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.notificationDelivery.findMany({
      include: { template: { select: { templateKey: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Provider-ready communications</p>
          <h1>Notification operations</h1>
          <p>
            Version channel templates, observe delivery state, and safely retry failed messages.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Operations console
        </Link>
      </div>
      <div className="partner-bookings__summary">
        {templates.map((template) => (
          <div className="ui-card" key={template.id}>
            <strong>{template.templateKey}</strong>
            <span>
              {template.channel} · v{template.version} · {template.status}
            </span>
          </div>
        ))}
      </div>
      <AdminNotificationManager deliveries={deliveries} />
    </section>
  );
}
