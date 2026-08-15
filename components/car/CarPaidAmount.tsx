'use client';

import { useSyncExternalStore } from 'react';

interface StoredCarBooking {
  confirmationCode?: string;
  total?: number;
}

interface CarPaidAmountProps {
  confirmationCode: string;
  fallbackTotal: number;
  inline?: boolean;
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);

const subscribe = () => () => undefined;

export function CarPaidAmount({
  confirmationCode,
  fallbackTotal,
  inline = false,
}: CarPaidAmountProps) {
  const amountPaid = useSyncExternalStore(
    subscribe,
    () => {
      const value = sessionStorage.getItem('mandyal-car-booking');
      if (!value) return fallbackTotal;

      try {
        const booking = JSON.parse(value) as StoredCarBooking;
        if (booking.confirmationCode === confirmationCode && typeof booking.total === 'number') {
          return booking.total;
        }
      } catch {
        // Keep the revalidated rental price when local booking data is unavailable.
      }
      return fallbackTotal;
    },
    () => fallbackTotal,
  );

  return inline ? <strong>{money(amountPaid)}</strong> : <dd>{money(amountPaid)}</dd>;
}
