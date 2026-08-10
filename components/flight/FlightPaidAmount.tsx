'use client';

import { useSyncExternalStore } from 'react';

interface StoredFlightBooking {
  confirmationCode?: string;
  total?: number;
}

interface FlightPaidAmountProps {
  confirmationCode: string;
  fallbackTotal: number;
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

const subscribe = () => () => undefined;

export function FlightPaidAmount({
  confirmationCode,
  fallbackTotal,
}: FlightPaidAmountProps) {
  const amountPaid = useSyncExternalStore(
    subscribe,
    () => {
      const value = sessionStorage.getItem('mandyal-flight-booking');
      if (!value) return fallbackTotal;

      try {
        const booking = JSON.parse(value) as StoredFlightBooking;
        if (
          booking.confirmationCode === confirmationCode &&
          typeof booking.total === 'number'
        ) {
          return booking.total;
        }
      } catch {
        // Keep the revalidated supplier fare when local booking data is unavailable.
      }
      return fallbackTotal;
    },
    () => fallbackTotal,
  );

  return <dd>{money(amountPaid)}</dd>;
}
