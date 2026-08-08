'use client';
import { useState } from 'react';
export function CarConfirmationDetails({ confirmationCode }: { confirmationCode: string }) {
  const [booking] = useState<
    { confirmationCode?: string; driver?: { firstName?: string; lastName?: string } } | undefined
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
  const driverName =
    driver?.firstName && driver?.lastName
      ? `${driver.firstName} ${driver.lastName}`
      : 'Primary driver';
  return (
    <>
      <dt>Primary driver</dt>
      <dd>{driverName}</dd>
    </>
  );
}
