'use client';

import { useSyncExternalStore } from 'react';

interface StoredBusBooking {
  confirmationCode?: string;
  total?: number;
}

interface BusPaidAmountProps {
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

export function BusPaidAmount({
  confirmationCode,
  fallbackTotal,
  inline = false,
}: BusPaidAmountProps) {
  const amountPaid = useSyncExternalStore(
    subscribe,
    () => {
      const value = sessionStorage.getItem('mandyal-bus-booking');
      if (!value) return fallbackTotal;

      try {
        const booking = JSON.parse(value) as StoredBusBooking;
        if (
          booking.confirmationCode === confirmationCode &&
          typeof booking.total === 'number'
        ) {
          return booking.total;
        }
      } catch {
        // Keep the revalidated operator fare when local booking data is unavailable.
      }
      return fallbackTotal;
    },
    () => fallbackTotal,
  );

  return inline ? <strong>{money(amountPaid)}</strong> : <dd>{money(amountPaid)}</dd>;
}
