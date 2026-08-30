import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Mailing-list subscriptions' };

export default async function AdminNewsletterSubscriptionsPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/newsletter-subscriptions');

  const subscriptions = await prisma.newsletterSubscription.findMany({
    orderBy: { consentAt: 'desc' },
    take: 500,
  });

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Permission-based audience</p>
          <h1>Mailing-list subscriptions</h1>
          <p>
            Review visitors who explicitly requested travel updates and hotel or car owner
            opportunities from the public footer.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/support">
          Support operations
        </Link>
      </header>

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table>
            <thead>
              <tr>
                <th>Subscribed</th>
                <th>Email</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td>{subscription.consentAt.toLocaleString('en-IN')}</td>
                  <td>
                    <a href={`mailto:${subscription.email}`}>{subscription.email}</a>
                  </td>
                  <td>{subscription.status}</td>
                  <td>{subscription.source}</td>
                </tr>
              ))}
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={4}>No mailing-list subscriptions have been received yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="booking-confirmation__note">
        Showing the 500 newest consent records. Use these addresses only for relevant Mandyal
        Travels communications and honor unsubscribe requests.
      </p>
    </section>
  );
}
