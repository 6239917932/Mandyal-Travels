'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BookingGuest, HotelBookingDraft } from '@/types/booking';

interface BookingContextValue {
  booking: HotelBookingDraft | null;
  clearBooking: () => void;
  confirmBooking: (confirmationCode: string, bookingId: string) => void;
  setBooking: (booking: HotelBookingDraft) => void;
  updateGuest: (guest: BookingGuest) => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<HotelBookingDraft | null>(null);

  const value = useMemo(
    () => ({
      booking,
      clearBooking: () => setBooking(null),
      confirmBooking: (confirmationCode: string, bookingId: string) =>
        setBooking((currentBooking) =>
          currentBooking
            ? {
                ...currentBooking,
                bookingId,
                confirmationCode,
                paymentStatus: 'captured',
                status: 'confirmed',
              }
            : currentBooking,
        ),
      setBooking,
      updateGuest: (guest: BookingGuest) =>
        setBooking((currentBooking) =>
          currentBooking ? { ...currentBooking, guest, status: 'payment-pending' } : currentBooking,
        ),
    }),
    [booking],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookingContext(): BookingContextValue {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error('useBookingContext must be used inside BookingProvider.');
  }

  return context;
}
