import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { WalkInBookingManager } from '@/components/partner/WalkInBookingManager';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { listPartnerDirectBookingOptions } from '@/services/partnerDirectBookingService';

export const metadata: Metadata = { title: 'Walk-in and direct booking' };

export default async function PartnerWalkInBookingPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const options = await listPartnerDirectBookingOptions(access.partnerId);
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Front office</p>
            <h1>Walk-in and direct booking</h1>
            <p className="booking-page__intro">
              Check private hotel inventory, review the exact desk rate, and create an audited
              pay-at-property reservation.
            </p>
          </div>
        </div>
        <WalkInBookingManager options={options} />
      </div>
    </main>
  );
}
