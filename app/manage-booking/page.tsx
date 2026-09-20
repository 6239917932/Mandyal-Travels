import type { Metadata } from 'next';

import { ManageBookingLookup } from '@/components/booking/ManageBookingLookup';
import { PublicPageHero } from '@/components/layout/PublicPageHero';

export const metadata: Metadata = { title: 'Manage booking' };

export default function ManageBookingPage() {
  return (
    <div>
      <PublicPageHero
        description="Enter the reference from your hotel confirmation to review your stay and available servicing options securely."
        eyebrow="Your hotel stay"
        imageAlt="An organised hotel reception prepared to assist a guest"
        imageSrc="/marketing/manage-booking-hero-v1.png"
        title="Manage your hotel booking"
      />
      <ManageBookingLookup />
    </div>
  );
}
