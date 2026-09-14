'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useBookingContext } from '@/context/BookingContext';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { Hotel, HotelRatePlan, HotelRoom } from '@/types/hotel';
import type { ApiErrorResponse, HotelBookingAddonOption, HotelQuote } from '@/types/commerce';

interface RoomSelectionButtonProps {
  adults: number;
  addons: HotelBookingAddonOption[];
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
  addons,
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
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  async function selectRoom() {
    setError(undefined);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/hotels/quotes', {
        body: JSON.stringify({
          adults,
          addons: Object.entries(selectedAddons).map(([addonId, quantity]) => ({
            addonId,
            quantity,
          })),
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
      const addonAmount = quote.components
        .filter((component) => component.type === 'addon-charge' || component.type === 'addon-tax')
        .reduce((total, component) => total + component.amount, 0);

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
          addonComponents: quote.components.filter(
            (component) => component.type === 'addon-charge' || component.type === 'addon-tax',
          ),
          addons: { amount: addonAmount, currency: quote.currency },
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
      {addons.length ? (
        <details className="hotel-room-card__addons">
          <summary>Enhance your stay</summary>
          <div className="hotel-room-card__addon-list">
            {addons.map((addon) => {
              const selected = selectedAddons[addon.id] !== undefined;
              return (
                <div className="hotel-room-card__addon" key={addon.id}>
                  <label>
                    <input
                      checked={selected}
                      onChange={(event) =>
                        setSelectedAddons((current) => {
                          const next = { ...current };
                          if (event.target.checked) next[addon.id] = addon.minQuantity;
                          else delete next[addon.id];
                          return next;
                        })
                      }
                      type="checkbox"
                    />
                    <span>
                      <strong>{addon.name}</strong>
                      <small>{addon.description}</small>
                    </span>
                  </label>
                  <span>
                    {new Intl.NumberFormat('en-IN', {
                      currency: addon.currency,
                      maximumFractionDigits: 0,
                      style: 'currency',
                    }).format(addon.unitAmount)}{' '}
                    · {addon.pricingMode.toLowerCase().replaceAll('_', ' ')}
                  </span>
                  {selected && addon.maxQuantity > addon.minQuantity ? (
                    <label>
                      <span>Quantity</span>
                      <input
                        aria-label={`${addon.name} quantity`}
                        max={addon.maxQuantity}
                        min={addon.minQuantity}
                        onChange={(event) =>
                          setSelectedAddons((current) => ({
                            ...current,
                            [addon.id]: Number(event.target.value),
                          }))
                        }
                        type="number"
                        value={selectedAddons[addon.id]}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
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
