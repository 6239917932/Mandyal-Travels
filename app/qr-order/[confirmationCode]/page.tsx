import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GuestRestaurantOrderForm } from '@/components/guest/GuestRestaurantOrderForm';
import { Card } from '@/components/ui/Card';
import { getGuestRestaurantOrderWorkspace } from '@/services/guestRestaurantOrderService';

export const metadata: Metadata = { title: 'Guest restaurant ordering | Mandyal Travels' };

export default async function GuestQrOrderPage({
  params,
}: {
  params: Promise<{ confirmationCode: string }>;
}) {
  const { confirmationCode } = await params;
  let workspace;
  try {
    workspace = await getGuestRestaurantOrderWorkspace(confirmationCode);
  } catch {
    redirect(`/login?returnTo=${encodeURIComponent(`/qr-order/${confirmationCode}`)}`);
  }
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Guest dining · secure digital menu</p>
            <h1>Order from {workspace.hotelName}</h1>
            <p className="booking-page__intro">
              Welcome, {workspace.guestName}. Select active menu items and send the order directly
              into the property kitchen queue. Menu prices are verified by the server.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/manage-booking">
            Manage booking
          </Link>
        </header>
        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            The digital menu is temporarily unavailable because its safety limit was reached.
          </p>
        ) : workspace.outlets.length ? (
          <Card>
            <GuestRestaurantOrderForm
              confirmationCode={confirmationCode}
              outlets={workspace.outlets}
            />
          </Card>
        ) : (
          <Card>
            <h2>Digital ordering is not open</h2>
            <p>This property has no active restaurant menu at the moment.</p>
          </Card>
        )}
      </div>
    </main>
  );
}
