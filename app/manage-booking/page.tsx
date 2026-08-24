import type { Metadata } from 'next';

import { ManageBookingLookup } from '@/components/booking/ManageBookingLookup';

export const metadata: Metadata = { title: 'Manage booking' };

export default function ManageBookingPage() {
  return <ManageBookingLookup />;
}
