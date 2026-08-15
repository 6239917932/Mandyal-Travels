'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BusinessCheckoutNotice } from '@/components/business/BusinessCheckoutNotice';
import { useBookingContext } from '@/context/BookingContext';
import {
  clearActiveBusinessTravelRequest,
  readActiveBusinessTravelRequest,
} from '@/lib/businessTravelClient';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, HotelBookingRecord } from '@/types/commerce';

const HOTEL_IDEMPOTENCY_KEY_PATTERN =
  /^hotel-booking-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getHotelIdempotencyKey(quoteId: string) {
  const storageKey = `mandyal-hotel-idempotency-${quoteId}`;
  const stored = window.sessionStorage.getItem(storageKey);
  if (stored && HOTEL_IDEMPOTENCY_KEY_PATTERN.test(stored)) return stored;

  const created = `hotel-booking-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function getPaymentIdempotencyKey(quoteId: string) {
  const storageKey = `mandyal-payment-idempotency-${quoteId}`;
  const stored = window.sessionStorage.getItem(storageKey);
  if (stored?.startsWith('payment-')) return stored;
  const created = `payment-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

interface AppliedPromotion {
  code: string;
  discountAmount: number;
  finalTotal: number;
}

interface PromotionResponse {
  data?: AppliedPromotion;
  error?: { message?: string };
}

interface CheckoutIntentResponse {
  data?: { checkoutUrl: string; id: string };
  error?: { code?: string; message?: string };
}

export default function PaymentPage() {
  const router = useRouter();
  const { booking, confirmBooking } = useBookingContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [promoCode, setPromoCode] = useState('');
  const [promotion, setPromotion] = useState<AppliedPromotion>();
  const [promotionError, setPromotionError] = useState<string>();
  const [isValidatingPromotion, setIsValidatingPromotion] = useState(false);
  const paymentReturnHandled = useRef(false);

  const bookingDraft = booking;
  const originalTotal = bookingDraft?.pricing.total.amount ?? 0;
  const finalTotal = promotion?.finalTotal ?? originalTotal;

  async function applyPromotion() {
    setPromotion(undefined);
    setPromotionError(undefined);
    setIsValidatingPromotion(true);

    try {
      const response = await fetch('/api/v1/promotions/validate', {
        body: JSON.stringify({
          code: promoCode,
          productType: 'HOTEL',
          subtotal: originalTotal,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<PromotionResponse>(response);

      if (!response.ok || !result?.data) {
        setPromotionError(result?.error?.message ?? 'The promotion could not be validated.');
        return;
      }

      setPromoCode(result.data.code);
      setPromotion(result.data);
    } catch {
      setPromotionError('The promotion service is temporarily unavailable.');
    } finally {
      setIsValidatingPromotion(false);
    }
  }

  const finalizeBooking = useCallback(
    async (paymentIntentId?: string, confirmedPromotionCode = promotion?.code) => {
      if (!bookingDraft?.guest) return;
      setPaymentError(undefined);
      setIsProcessing(true);

      const businessRequest = readActiveBusinessTravelRequest();
      if (businessRequest && businessRequest.productType !== 'HOTEL') {
        setPaymentError('The active company approval is for a different travel product.');
        setIsProcessing(false);
        return;
      }

      try {
        const idempotencyKey = getHotelIdempotencyKey(bookingDraft.quoteId);
        const response = await fetch('/api/v1/hotels/bookings', {
          body: JSON.stringify({
            availabilityLockId: bookingDraft.availabilityLock.id,
            businessTravelRequestId: businessRequest?.id,
            guest: bookingDraft.guest,
            hotelSlug: bookingDraft.hotel.slug,
            paymentIntentId,
            promotionCode: confirmedPromotionCode,
            quoteId: bookingDraft.quoteId,
          }),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          method: 'POST',
        });

        const result = await readJsonResponse<{ data: HotelBookingRecord } | ApiErrorResponse>(
          response,
        );
        if (!response.ok || !result || !('data' in result)) {
          setPaymentError(
            result && 'error' in result
              ? result.error.message
              : 'The booking could not be completed. No payment was captured.',
          );
          setIsProcessing(false);
          return;
        }

        const createdBooking = result.data;
        if (businessRequest) clearActiveBusinessTravelRequest();
        confirmBooking(
          createdBooking.confirmationCode,
          createdBooking.id,
          createdBooking.totalAmount,
        );
        router.push(`/hotels/${bookingDraft.hotel.slug}/booking/confirmation`);
      } catch {
        setPaymentError('The booking service is unavailable. No payment was captured.');
        setIsProcessing(false);
      }
    },
    [bookingDraft, confirmBooking, promotion?.code, router],
  );

  useEffect(() => {
    const returned = new URLSearchParams(window.location.search).get('paymentReturn') === '1';
    if (!bookingDraft?.guest || !returned || paymentReturnHandled.current) return;
    paymentReturnHandled.current = true;
    const intentId = window.sessionStorage.getItem(
      `mandyal-payment-intent-${bookingDraft.quoteId}`,
    );
    if (!intentId) {
      window.setTimeout(
        () => setPaymentError('The payment return could not be matched to this booking.'),
        0,
      );
      return;
    }
    const confirmedPromotionCode = window.sessionStorage.getItem(
      `mandyal-payment-promotion-${bookingDraft.quoteId}`,
    );
    window.setTimeout(() => void finalizeBooking(intentId, confirmedPromotionCode ?? undefined), 0);
  }, [bookingDraft?.guest, bookingDraft?.quoteId, finalizeBooking]);

  if (!bookingDraft || !bookingDraft.guest) {
    return (
      <div className="booking-page">
        <div className="booking-page__container">
          <Card className="booking-page__empty-state">
            <p className="hotel-page__eyebrow">Booking details required</p>
            <h1>Complete the earlier booking steps first.</h1>
            <p>Select a room and add the lead guest before continuing to payment.</p>
            <Link className="booking-page__back-link" href="/hotels">
              Browse hotels
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    if (!bookingDraft?.guest) {
      return;
    }
    event.preventDefault();
    setPaymentError(undefined);
    setIsProcessing(true);
    try {
      const response = await fetch('/api/v1/payments/checkout-intents', {
        body: JSON.stringify({ quoteId: bookingDraft.quoteId, promotionCode: promotion?.code }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': getPaymentIdempotencyKey(bookingDraft.quoteId),
        },
        method: 'POST',
      });
      const result = await readJsonResponse<CheckoutIntentResponse>(response);
      if (response.ok && result?.data) {
        window.sessionStorage.setItem(
          `mandyal-payment-intent-${bookingDraft.quoteId}`,
          result.data.id,
        );
        if (promotion?.code) {
          window.sessionStorage.setItem(
            `mandyal-payment-promotion-${bookingDraft.quoteId}`,
            promotion.code,
          );
        }
        window.location.assign(result.data.checkoutUrl);
        return;
      }
      if (result?.error?.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
        await finalizeBooking();
        return;
      }
      setPaymentError(result?.error?.message ?? 'Secure checkout is temporarily unavailable.');
    } catch {
      setPaymentError('Secure checkout is temporarily unavailable. No payment was captured.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <p className="hotel-page__eyebrow">Secure payment</p>
        <h1>Complete your booking</h1>
        <p className="booking-page__intro">
          Review the final total and continue to our payment provider&apos;s secure hosted checkout.
        </p>

        <div className="booking-page__grid">
          <Card className="booking-page__payment-card">
            <div className="booking-page__secure-banner">
              <strong>Protected payment</strong>
              <span>Mandyal Travels never collects or stores your card details on this page.</span>
            </div>

            <form className="booking-page__guest-form" onSubmit={submitPayment}>
              <BusinessCheckoutNotice productType="HOTEL" />
              <div className="booking-page__payment-fields">
                <Input
                  autoComplete="off"
                  label="Promotion code"
                  name="promoCode"
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromotion(undefined);
                  }}
                  placeholder="STAYMORE"
                  value={promoCode}
                />
                <div className="ui-field">
                  <span className="ui-field__label">Offer validation</span>
                  <Button
                    disabled={promoCode.trim().length === 0}
                    isLoading={isValidatingPromotion}
                    onClick={applyPromotion}
                    type="button"
                    variant="secondary"
                  >
                    Apply code
                  </Button>
                </div>
              </div>
              {promotionError ? (
                <p className="booking-page__payment-error" role="alert">
                  {promotionError}
                </p>
              ) : null}
              {promotion ? (
                <div className="booking-page__secure-banner" role="status">
                  <strong>{promotion.code} applied</strong>
                  <span>
                    Save{' '}
                    {formatCurrency(promotion.discountAmount, bookingDraft.pricing.total.currency)}{' '}
                    and pay{' '}
                    {formatCurrency(promotion.finalTotal, bookingDraft.pricing.total.currency)}.
                  </span>
                </div>
              ) : null}
              <Button fullWidth isLoading={isProcessing} type="submit" variant="accent">
                Continue to secure payment ·{' '}
                {formatCurrency(finalTotal, bookingDraft.pricing.total.currency)}
              </Button>
              {paymentError ? (
                <p className="booking-page__payment-error" role="alert">
                  {paymentError}
                </p>
              ) : null}
            </form>
          </Card>

          <Card className="booking-page__price-card">
            <p className="booking-page__location">Final booking summary</p>
            <h2>{bookingDraft.hotel.name}</h2>
            <p>{bookingDraft.selectedRoom.name}</p>
            <dl>
              <div>
                <dt>Lead guest</dt>
                <dd>
                  {bookingDraft.guest.firstName} {bookingDraft.guest.lastName}
                </dd>
              </div>
              <div>
                <dt>Stay</dt>
                <dd>
                  {bookingDraft.checkInDate} - {bookingDraft.checkOutDate}
                </dd>
              </div>
              <div className="booking-page__total">
                <dt>{promotion ? 'Fare before offers' : 'Total'}</dt>
                <dd>{formatCurrency(originalTotal, bookingDraft.pricing.total.currency)}</dd>
              </div>
              {promotion ? (
                <>
                  <div>
                    <dt>Offer savings</dt>
                    <dd>
                      -
                      {formatCurrency(
                        promotion.discountAmount,
                        bookingDraft.pricing.total.currency,
                      )}
                    </dd>
                  </div>
                  <div className="booking-page__total">
                    <dt>Amount to pay</dt>
                    <dd>{formatCurrency(finalTotal, bookingDraft.pricing.total.currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <p>{bookingDraft.ratePlan.cancellationPolicy.description}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
