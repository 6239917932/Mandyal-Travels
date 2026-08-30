import type { Metadata } from 'next';

import { ManageBookingLookup } from '@/components/booking/ManageBookingLookup';
import { PublicPageHero } from '@/components/layout/PublicPageHero';

export const metadata: Metadata = { title: 'Manage booking' };

export default function ManageBookingPage() {
  return (
    <div>
      <PublicPageHero
        description="Enter the booking reference from your confirmation to review and service your journey securely."
        eyebrow="Your trip"
        title="Manage your booking"
      />
      <ManageBookingLookup />
    </div>
  );
}
