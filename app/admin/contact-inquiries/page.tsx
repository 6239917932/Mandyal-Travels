import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Contact inquiries' };

function categoryLabel(category: string): string {
  switch (category) {
    case 'HOTEL_OWNER':
      return 'Hotel owner';
    case 'CAR_OWNER':
      return 'Car owner';
    case 'BOOKING_HELP':
      return 'Booking help';
    default:
      return 'General';
  }
}

export default async function AdminContactInquiriesPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/contact-inquiries');

  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Public message inbox</p>
          <h1>Contact inquiries</h1>
          <p>
            Review the newest customer, hotel-owner, and car-owner messages captured by the public
            contact form.
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
                <th>Received</th>
                <th>Reference</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>{inquiry.createdAt.toLocaleString('en-IN')}</td>
                  <td>
                    <strong>{inquiry.reference}</strong>
                  </td>
                  <td>{categoryLabel(inquiry.category)}</td>
                  <td>
                    <a href={`mailto:${inquiry.email}`}>{inquiry.name}</a>
                    <br />
                    <small>{inquiry.email}</small>
                    {inquiry.phone ? (
                      <>
                        <br />
                        <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                      </>
                    ) : null}
                  </td>
                  <td>{inquiry.message}</td>
                </tr>
              ))}
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={5}>No public contact messages have been received yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="booking-confirmation__note">
        Showing the 100 newest inquiries. Contact details are visible only to platform
        administrators.
      </p>
    </section>
  );
}
