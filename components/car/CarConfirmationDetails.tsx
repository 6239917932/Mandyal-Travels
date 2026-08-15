'use client';
import { useState } from 'react';
export function CarConfirmationDetails({ confirmationCode }: { confirmationCode: string }) {
  const [booking] = useState<
    {
      confirmationCode?: string;
      driver?: { firstName?: string; lastName?: string };
      traveller?: { firstName?: string; lastName?: string };
    } | undefined
  >(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = sessionStorage.getItem('mandyal-car-booking');
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  });
  const matchingBooking = booking?.confirmationCode === confirmationCode ? booking : undefined;
  const driver = matchingBooking?.driver;
  const traveller = matchingBooking?.traveller;
  const party = driver ?? traveller;
  const partyName =
    party?.firstName && party?.lastName ? `${party.firstName} ${party.lastName}` : 'Booking contact';
  return (
    <>
      <dt>{driver ? 'Primary driver' : 'Lead traveller'}</dt>
      <dd>{partyName}</dd>
    </>
  );
}
