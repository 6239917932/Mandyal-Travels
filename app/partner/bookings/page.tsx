'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse, PartnerBookingRecord } from '@/types/commerce';

type PartnerBookingMeta = {
  capturedInrValue: number;
  confirmedCount: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type AvailablePhysicalRoom = {
  floorLabel: string;
  roomNumber: string;
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<PartnerBookingRecord[]>([]);
  const [meta, setMeta] = useState<PartnerBookingMeta>();
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [stayStatus, setStayStatus] = useState('');
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [arrivalThrough, setArrivalThrough] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [updatingBooking, setUpdatingBooking] = useState<string>();
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string[]>>({});
  const [availableRooms, setAvailableRooms] = useState<Record<string, AvailablePhysicalRoom[]>>({});
  const [partnerNotes, setPartnerNotes] = useState<Record<string, string>>({});
  const exportParameters = new URLSearchParams();
  if (query) exportParameters.set('query', query);
  if (bookingStatus) exportParameters.set('bookingStatus', bookingStatus);
  if (stayStatus) exportParameters.set('stayStatus', stayStatus);
  if (arrivalFrom) exportParameters.set('arrivalFrom', arrivalFrom);
  if (arrivalThrough) exportParameters.set('arrivalThrough', arrivalThrough);
  const exportHref = `/api/v1/partner/bookings/export${exportParameters.size ? `?${exportParameters.toString()}` : ''}`;
  const loadPage = useCallback(
    async (page: number) => {
      setError(undefined);
      setIsLoading(true);
      try {
        const parameters = new URLSearchParams({ page: String(page), pageSize: '50' });
        if (query) parameters.set('query', query);
        if (bookingStatus) parameters.set('bookingStatus', bookingStatus);
        if (stayStatus) parameters.set('stayStatus', stayStatus);
        if (arrivalFrom) parameters.set('arrivalFrom', arrivalFrom);
        if (arrivalThrough) parameters.set('arrivalThrough', arrivalThrough);
        const response = await fetch(`/api/v1/partner/bookings?${parameters.toString()}`);
        const result = await readJsonResponse<
          { data: PartnerBookingRecord[]; meta: PartnerBookingMeta } | ApiErrorResponse
        >(response);
        if (!response.ok || !result || !('data' in result)) {
          setError(
            response.status === 401
              ? 'Sign in with an assigned partner account to open this workspace.'
              : 'Bookings could not be loaded.',
          );
          return;
        }
        setBookings(result.data);
        setMeta(result.meta);
      } catch {
        setError('The partner service could not be reached.');
      } finally {
        setIsLoading(false);
      }
    },
    [arrivalFrom, arrivalThrough, bookingStatus, query, stayStatus],
  );

  useEffect(() => {
    const task = window.setTimeout(() => void loadPage(1), 0);
    return () => window.clearTimeout(task);
  }, [loadPage]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(filter.trim());
  }

  async function loadAvailableRooms(confirmationCode: string) {
    setError(undefined);
    setUpdatingBooking(confirmationCode);
    try {
      const response = await fetch(`/api/v1/partner/bookings/${confirmationCode}`);
      const result = await readJsonResponse<{ data: AvailablePhysicalRoom[] } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'Available rooms could not be loaded.',
        );
        return;
      }
      setAvailableRooms((current) => ({ ...current, [confirmationCode]: result.data }));
      setRoomAssignments((current) => ({ ...current, [confirmationCode]: [] }));
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setUpdatingBooking(undefined);
    }
  }

  function toggleRoom(confirmationCode: string, roomNumber: string, maximumRooms: number) {
    setRoomAssignments((current) => {
      const selected = current[confirmationCode] ?? [];
      if (selected.includes(roomNumber)) {
        return {
          ...current,
          [confirmationCode]: selected.filter((candidate) => candidate !== roomNumber),
        };
      }
      if (selected.length >= maximumRooms) return current;
      return { ...current, [confirmationCode]: [...selected, roomNumber] };
    });
  }

  async function updateStayStatus(
    confirmationCode: string,
    status: 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW',
    assignedRoomNumbers: string[] = [],
  ) {
    setError(undefined);
    setUpdatingBooking(confirmationCode);
    try {
      const response = await fetch(`/api/v1/partner/bookings/${confirmationCode}`, {
        body: JSON.stringify({ assignedRoomNumbers, status }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<
        | {
            data: {
              assignedRoomNumbers: string[];
              operationalStatus: PartnerBookingRecord['operationalStatus'];
            };
          }
        | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The stay status could not be updated.',
        );
        return;
      }
      setBookings((current) =>
        current.map((booking) =>
          booking.confirmationCode === confirmationCode
            ? {
                ...booking,
                assignedRoomNumbers: result.data.assignedRoomNumbers,
                operationalStatus: result.data.operationalStatus,
              }
            : booking,
        ),
      );
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setUpdatingBooking(undefined);
    }
  }

  async function savePartnerNote(booking: PartnerBookingRecord) {
    setError(undefined);
    setUpdatingBooking(booking.confirmationCode);
    try {
      const partnerNote = partnerNotes[booking.confirmationCode] ?? booking.partnerNote;
      const response = await fetch(`/api/v1/partner/bookings/${booking.confirmationCode}`, {
        body: JSON.stringify({ partnerNote }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: { partnerNote: string } } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The front-desk note could not be saved.',
        );
        return;
      }
      setBookings((current) =>
        current.map((candidate) =>
          candidate.confirmationCode === booking.confirmationCode
            ? { ...candidate, partnerNote: result.data.partnerNote }
            : candidate,
        ),
      );
      setPartnerNotes((current) => ({
        ...current,
        [booking.confirmationCode]: result.data.partnerNote,
      }));
    } catch {
      setError('The partner service could not be reached.');
    } finally {
      setUpdatingBooking(undefined);
    }
  }

  return (
    <div className="booking-page partner-bookings">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Partner operations</p>
            <h1>Booking dashboard</h1>
            <p className="booking-page__intro">
              Monitor hotel reservations, payment state, stay dates, and room allocation.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner">
              Workspace
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              Inventory
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/amendments">
              Amendments
            </Link>
            <Link className="ui-button ui-button--secondary" href={exportHref} prefetch={false}>
              Export CSV
            </Link>
          </div>
        </div>
        {isLoading && !meta ? <Card>Loading your assigned booking records…</Card> : null}
        {error ? (
          <p className="booking-page__payment-error" role="alert">
            {error}
          </p>
        ) : null}
        {meta ? (
          <>
            <div className="partner-bookings__summary">
              <Card>
                <span>Total bookings</span>
                <strong>{meta.totalCount}</strong>
              </Card>
              <Card>
                <span>Confirmed</span>
                <strong>{meta.confirmedCount}</strong>
              </Card>
              <Card>
                <span>Captured value</span>
                <strong>{money(meta.capturedInrValue, 'INR')}</strong>
              </Card>
            </div>
            <Card className="partner-bookings__search">
              <form className="supplier-form__grid" onSubmit={applyFilters}>
                <Input
                  label="Search all bookings"
                  name="filter"
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Reference, guest, email, or hotel"
                  value={filter}
                />
                <label className="ui-field">
                  <span className="ui-field__label">Booking status</span>
                  <select
                    className="ui-input"
                    onChange={(event) => setBookingStatus(event.target.value)}
                    value={bookingStatus}
                  >
                    <option value="">All bookings</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="ui-field">
                  <span className="ui-field__label">Stay status</span>
                  <select
                    className="ui-input"
                    onChange={(event) => setStayStatus(event.target.value)}
                    value={stayStatus}
                  >
                    <option value="">All stay statuses</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="CHECKED_IN">Checked in</option>
                    <option value="CHECKED_OUT">Checked out</option>
                    <option value="NO_SHOW">No-show</option>
                  </select>
                </label>
                <Input
                  label="Arriving from"
                  name="arrivalFrom"
                  onChange={(event) => setArrivalFrom(event.target.value)}
                  type="date"
                  value={arrivalFrom}
                />
                <Input
                  label="Arriving through"
                  min={arrivalFrom || undefined}
                  name="arrivalThrough"
                  onChange={(event) => setArrivalThrough(event.target.value)}
                  type="date"
                  value={arrivalThrough}
                />
                <Button type="submit">Apply search</Button>
              </form>
            </Card>
            <div className="partner-bookings__list" aria-live="polite">
              {bookings.map((booking) => (
                <Card className="partner-bookings__booking" key={booking.confirmationCode}>
                  <div className="booking-confirmation__reference">
                    <span>{booking.hotelName}</span>
                    <strong>{booking.confirmationCode}</strong>
                  </div>
                  <div className="booking-confirmation__details">
                    <div>
                      <span>Guest</span>
                      <strong>{booking.guestName}</strong>
                      <small>{booking.guestEmail}</small>
                    </div>
                    <div>
                      <span>Stay</span>
                      <strong>
                        {booking.checkInDate} - {booking.checkOutDate}
                      </strong>
                    </div>
                    <div>
                      <span>Room</span>
                      <strong>
                        {booking.rooms} × {booking.roomName}
                      </strong>
                      <small>{booking.ratePlanName}</small>
                      {booking.assignedRoomNumbers.length ? (
                        <small>Assigned: {booking.assignedRoomNumbers.join(', ')}</small>
                      ) : null}
                    </div>
                    <div>
                      <span>Booking</span>
                      <strong className={`partner-status partner-status--${booking.status}`}>
                        {booking.status}
                      </strong>
                      <small>{booking.operationalStatus.replaceAll('_', ' ').toLowerCase()}</small>
                      <small>
                        {booking.source === 'PARTNER_DIRECT' ? 'Direct / walk-in' : 'Online'}
                      </small>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>
                        {booking.source === 'PARTNER_DIRECT' && booking.paymentStatus === 'pending'
                          ? 'Due at property'
                          : booking.paymentStatus}
                      </strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{money(booking.totalAmount, booking.currency)}</strong>
                    </div>
                  </div>
                  {booking.status === 'confirmed' &&
                  ['RESERVED', 'CHECKED_IN'].includes(booking.operationalStatus) ? (
                    <div className="manage-booking__document-actions">
                      <Link
                        className="ui-button ui-button--secondary"
                        href={`/partner/pms/guest-registration?booking=${encodeURIComponent(booking.confirmationCode)}`}
                      >
                        Open guest register
                      </Link>
                      <Link
                        className="ui-button ui-button--secondary"
                        href={`/partner/pms/billing?booking=${encodeURIComponent(booking.confirmationCode)}`}
                      >
                        Open folio
                      </Link>
                    </div>
                  ) : null}
                  {booking.specialRequests ? (
                    <div className="booking-confirmation__note">
                      <strong>Guest special requests</strong>
                      <p>{booking.specialRequests}</p>
                      <small>
                        Requests are preferences and are not guaranteed until the property confirms
                        them.
                      </small>
                    </div>
                  ) : null}
                  <div className="ui-field">
                    <label
                      className="ui-field__label"
                      htmlFor={`partner-note-${booking.confirmationCode}`}
                    >
                      Private front-desk note
                    </label>
                    <textarea
                      className="ui-input supplier-form__textarea"
                      id={`partner-note-${booking.confirmationCode}`}
                      maxLength={1000}
                      onChange={(event) =>
                        setPartnerNotes((current) => ({
                          ...current,
                          [booking.confirmationCode]: event.target.value,
                        }))
                      }
                      placeholder="Arrival preferences, accessibility support, or internal handover notes"
                      value={partnerNotes[booking.confirmationCode] ?? booking.partnerNote}
                    />
                    <Button
                      disabled={updatingBooking === booking.confirmationCode}
                      onClick={() => void savePartnerNote(booking)}
                      variant="secondary"
                    >
                      Save private note
                    </Button>
                  </div>
                  {booking.status === 'confirmed' && booking.operationalStatus === 'RESERVED' ? (
                    <div>
                      {availableRooms[booking.confirmationCode] ? (
                        <fieldset className="supplier-amenities__group">
                          <legend>
                            Select {booking.rooms} ready physical room
                            {booking.rooms === 1 ? '' : 's'}
                          </legend>
                          <div className="supplier-amenities__grid">
                            {availableRooms[booking.confirmationCode].map((room) => (
                              <label className="supplier-amenities__option" key={room.roomNumber}>
                                <input
                                  checked={(
                                    roomAssignments[booking.confirmationCode] ?? []
                                  ).includes(room.roomNumber)}
                                  disabled={
                                    !(roomAssignments[booking.confirmationCode] ?? []).includes(
                                      room.roomNumber,
                                    ) &&
                                    (roomAssignments[booking.confirmationCode] ?? []).length >=
                                      booking.rooms
                                  }
                                  onChange={() =>
                                    toggleRoom(
                                      booking.confirmationCode,
                                      room.roomNumber,
                                      booking.rooms,
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>
                                  Room {room.roomNumber}
                                  {room.floorLabel ? ` · ${room.floorLabel}` : ''}
                                </span>
                              </label>
                            ))}
                          </div>
                          {availableRooms[booking.confirmationCode].length === 0 ? (
                            <p>
                              No registered ready rooms are available for this room type. Update
                              housekeeping first.
                            </p>
                          ) : null}
                        </fieldset>
                      ) : (
                        <Button
                          disabled={updatingBooking === booking.confirmationCode}
                          onClick={() => void loadAvailableRooms(booking.confirmationCode)}
                          variant="secondary"
                        >
                          Choose registered rooms
                        </Button>
                      )}
                      <div className="manage-booking__document-actions">
                        <Button
                          disabled={
                            updatingBooking === booking.confirmationCode ||
                            (roomAssignments[booking.confirmationCode] ?? []).length !==
                              booking.rooms
                          }
                          onClick={() =>
                            updateStayStatus(
                              booking.confirmationCode,
                              'CHECKED_IN',
                              roomAssignments[booking.confirmationCode] ?? [],
                            )
                          }
                          variant="secondary"
                        >
                          Assign rooms and check in
                        </Button>
                        <Button
                          disabled={updatingBooking === booking.confirmationCode}
                          onClick={() => updateStayStatus(booking.confirmationCode, 'NO_SHOW')}
                          variant="secondary"
                        >
                          Mark no-show
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {booking.status === 'confirmed' && booking.operationalStatus === 'CHECKED_IN' ? (
                    <div className="manage-booking__document-actions">
                      <Button
                        disabled={updatingBooking === booking.confirmationCode}
                        onClick={() => updateStayStatus(booking.confirmationCode, 'CHECKED_OUT')}
                        variant="secondary"
                      >
                        Check out guest
                      </Button>
                    </div>
                  ) : null}
                </Card>
              ))}
              {bookings.length === 0 ? <p>No bookings match these filters.</p> : null}
            </div>
            <Card className="business-report__pagination">
              <p>
                Page {meta.page} of {meta.totalPages} · showing up to {meta.pageSize} bookings
              </p>
              <div className="manage-booking__document-actions">
                <Button
                  disabled={isLoading || meta.page <= 1}
                  onClick={() => loadPage(meta.page - 1)}
                  variant="secondary"
                >
                  Previous page
                </Button>
                <Button
                  disabled={isLoading || meta.page >= meta.totalPages}
                  onClick={() => loadPage(meta.page + 1)}
                  variant="secondary"
                >
                  Next page
                </Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
