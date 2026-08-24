import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SavedTravelerManager } from '@/components/account/SavedTravelerManager';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { SAVED_TRAVELER_LIMIT } from '@/services/savedTravelerService';

export const metadata: Metadata = { title: 'Saved travelers' };

export default async function SavedTravelersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=%2Faccount%2Ftravelers');

  const travelers = await prisma.savedTraveler.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    select: {
      dateOfBirth: true,
      email: true,
      firstName: true,
      gender: true,
      id: true,
      label: true,
      lastName: true,
      phone: true,
      relationship: true,
    },
    take: SAVED_TRAVELER_LIMIT,
    where: { userId: user.id },
  });

  return (
    <section className="account-page">
      <div className="partner-page__heading">
        <div>
          <p className="hotel-page__eyebrow">Faster checkout</p>
          <h1>Saved travelers</h1>
          <p>
            Keep basic traveler details ready, then choose when to fill empty fields during a
            booking.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/account">
          Back to my account
        </Link>
      </div>
      <SavedTravelerManager initialTravelers={travelers} />
    </section>
  );
}
