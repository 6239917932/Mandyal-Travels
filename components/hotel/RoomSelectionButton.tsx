'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useBookingContext } from '@/context/BookingContext';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { Hotel, HotelRatePlan, HotelRoom } from '@/types/hotel';
import type { ApiErrorResponse, HotelQuote } from '@/types/commerce';

interface RoomSelectionButtonProps {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  childGuests: number;
  hotel: Hotel;
  ratePlan: HotelRatePlan;
  rooms: number;
  selectedRoom: HotelRoom;
}

export function RoomSelectionButton({
  adults,
  checkInDate,
  checkOutDate,
  childGuests,
  hotel,
  ratePlan,
  rooms,
  selectedRoom,
}: RoomSelectionButtonProps) {
  const router = useRouter();
  const { setBooking } = useBookingContext();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function selectRoom() {
    setError(undefined);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/hotels/quotes', {
        body: JSON.stringify({
          adults,
          checkInDate,
          checkOutDate,
          children: childGuests,
          hotelSlug: hotel.slug,
          ratePlanId: ratePlan.id,
          rooms,
          roomTypeId: selectedRoom.roomTypeId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<Partial<ApiErrorResponse> & { data?: HotelQuote }>(response)) ?? {};

      if (!response.ok) {
        setError(result.error?.message ?? 'The room price could not be confirmed. Try again.');
        return;
      }

      const quote = result.data;
      if (!quote) {
        setError('The room quote was incomplete. Please try again.');
        return;
      }

      const roomCharges = quote.components.find((component) => component.type === 'room-charge');
      const taxesAndFees = quote.components.find((component) => component.type === 'tax-and-fee');

      if (!roomCharges || !taxesAndFees) {
        setError('The price breakdown is incomplete. Please try again.');
        return;
      }

      setBooking({
        availabilityLock: quote.availabilityLock,
        checkInDate,
        checkOutDate,
        hotel,
        pricing: {
          roomCharges: { amount: roomCharges.amount, currency: roomCharges.currency },
          taxesAndFees: { amount: taxesAndFees.amount, currency: taxesAndFees.currency },
          total: { amount: quote.totalAmount, currency: quote.currency },
        },
        quoteExpiresAt: quote.expiresAt,
        quoteId: quote.id,
        ratePlan,
        rooms,
        selectedRoom,
        status: 'room-selected',
      });

      router.push(`/hotels/${hotel.slug}/booking`);
    } catch {
      setError('The room service could not be reached. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        className="hotel-room-card__select-button"
        fullWidth
        isLoading={isLoading}
        onClick={selectRoom}
      >
        Select room
      </Button>
      {error ? (
        <p className="hotel-room-card__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
