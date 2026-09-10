import type { Metadata } from 'next';

import PartnerBookingsPage from '@/app/partner/bookings/page';

export const metadata: Metadata = { title: 'Hotel reservations' };

export default function HotelReservationsPage() {
  return <PartnerBookingsPage />;
}
