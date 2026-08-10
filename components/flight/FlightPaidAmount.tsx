'use client';

import { useEffect, useState } from 'react';

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

export function FlightPaidAmount({
  confirmationCode,
  fallbackTotal,
}: FlightPaidAmountProps) {
  const [amountPaid, setAmountPaid] = useState(fallbackTotal);

  useEffect(() => {
    const value = sessionStorage.getItem('mandyal-flight-booking');
    if (!value) return;

    try {
      const booking = JSON.parse(value) as StoredFlightBooking;
      if (
        booking.confirmationCode === confirmationCode &&
        typeof booking.total === 'number'
      ) {
        setAmountPaid(booking.total);
      }
    } catch {
      // Keep the revalidated supplier fare when local booking data is unavailable.
    }
  }, [confirmationCode]);

  return <dd>{money(amountPaid)}</dd>;
}
