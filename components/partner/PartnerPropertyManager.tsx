'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type RoomType = {
  id: string;
  inventoryCount: number;
  mealPlan: string;
  name: string;
  nightlyRate: number;
  ratePlanName: string;
  roomTypeId: string;
  status: string;
  taxesAndFees: number;
};

export type ManagedProperty = {
  city: string;
  displayName: string;
  hotelSlug: string;
  id: string;
  publicationStatus: string;
  rooms: RoomType[];
  starRating: number;
  state: string;
};

function messageFrom(result: { data?: unknown } | ApiErrorResponse | null, fallback: string) {
  return result && 'error' in result ? result.error.message : fallback;
}

export function PartnerPropertyManager({
  canManage,
  initialProperties,
}: {
  canManage: boolean;
  initialProperties: ManagedProperty[];
}) {
  const [properties, setProperties] = useState<ManagedProperty[]>(initialProperties);
  const [activeRoomForm, setActiveRoomForm] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/partner/properties');
      const result = await readJsonResponse<{ data: ManagedProperty[] } | ApiErrorResponse>(
        response,
      );
      if (!response.ok || !result || !('data' in result)) {
        setError(messageFrom(result, 'Properties could not be loaded.'));
        return;
      }
      setProperties(result.data);
    } catch {
      setError('The property service could not be reached.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setError(undefined);
    setSuccess(undefined);
    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/partner/properties', {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: ManagedProperty } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(messageFrom(result, 'The property could not be added.'));
        return;
      }
      form.reset();
      setActiveRoomForm(result.data.id);
      setSuccess(
        `${result.data.displayName} was saved as a draft. Add its first room to publish it.`,
      );
      await loadProperties();
    } catch {
      setError('The property service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  async function createRoom(event: FormEvent<HTMLFormElement>, property: ManagedProperty) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    setError(undefined);
    setSuccess(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/partner/properties/${property.id}/rooms`, {
        body: JSON.stringify({ ...data, refundable: formData.get('refundable') === 'on' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<{ data: RoomType } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(messageFrom(result, 'The room type could not be added.'));
        return;
      }
      form.reset();
      setActiveRoomForm(undefined);
      setSuccess(
        `${result.data.name} was added. ${property.displayName} is now visible in hotel search.`,
      );
      await loadProperties();
    } catch {
      setError('The room service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  async function changePublication(property: ManagedProperty) {
    const action = property.publicationStatus === 'PUBLISHED' ? 'PAUSE' : 'PUBLISH';
    setError(undefined);
    setSuccess(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/partner/properties/${property.id}`, {
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: ManagedProperty } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(messageFrom(result, 'The publication status could not be updated.'));
        return;
      }
      setSuccess(
        action === 'PUBLISH'
          ? `${property.displayName} is now visible in hotel search.`
          : `${property.displayName} has been paused from new sales.`,
      );
      await loadProperties();
    } catch {
      setError('The property service could not be reached.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="booking-page partner-property-manager">
      <div className="booking-page__container">
        <div className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Hotel supplier PMS</p>
            <h1>Properties, rooms, and rates</h1>
            <p className="booking-page__intro">
              Create verified accommodation inventory, publish rooms to hotel search, and then
              manage daily availability from the PMS calendar.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner">
              Workspace
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/inventory">
              PMS calendar
            </Link>
          </div>
        </div>

        {!canManage ? (
          <Card>
            <strong>View-only supplier access</strong>
            <p>Only the named supplier administrator can create properties and room types.</p>
          </Card>
        ) : (
          <Card className="partner-property-manager__setup">
            <div className="booking-confirmation__reference">
              <span>Step 1</span>
              <strong>Create a property</strong>
            </div>
            <p>The property remains private until its first sellable room and rate are added.</p>
            <form className="supplier-form" onSubmit={createProperty}>
              <div className="supplier-form__grid">
                <Input
                  label="Property name"
                  maxLength={140}
                  minLength={2}
                  name="displayName"
                  required
                />
                <Input label="City" maxLength={80} minLength={2} name="city" required />
                <Input label="State" maxLength={80} minLength={2} name="state" required />
                <Input
                  defaultValue="India"
                  label="Country"
                  maxLength={80}
                  name="country"
                  required
                />
                <Input
                  label="Street address"
                  maxLength={240}
                  minLength={5}
                  name="streetAddress"
                  required
                />
                <Input label="Postal code" maxLength={20} name="postalCode" />
                <label className="ui-field">
                  <span className="ui-field__label">Star rating</span>
                  <select className="ui-input" defaultValue="3" name="starRating" required>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} star
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  defaultValue="14:00"
                  label="Check-in time"
                  name="checkInTime"
                  required
                  type="time"
                />
                <Input
                  defaultValue="11:00"
                  label="Check-out time"
                  name="checkOutTime"
                  required
                  type="time"
                />
                <Input
                  label="Property amenities"
                  name="amenities"
                  placeholder="Wi-Fi, Parking, Restaurant, Pool"
                />
              </div>
              <label className="ui-field">
                <span className="ui-field__label">Property description</span>
                <textarea
                  className="ui-input supplier-form__textarea"
                  maxLength={1500}
                  minLength={30}
                  name="description"
                  required
                />
              </label>
              <label className="ui-field">
                <span className="ui-field__label">Guest policies (one per line)</span>
                <textarea
                  className="ui-input supplier-form__textarea"
                  name="policies"
                  placeholder={'Government ID required at check-in\nNo smoking in rooms'}
                />
              </label>
              <Input
                label="Property photo URL (optional)"
                name="imageUrl"
                placeholder="Secure images.unsplash.com URL"
                type="url"
              />
              <Button fullWidth isLoading={isSaving} type="submit" variant="primary">
                Save draft property
              </Button>
            </form>
          </Card>
        )}

        {error ? (
          <p className="booking-page__payment-error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="partner-property-manager__success" role="status">
            {success}
          </p>
        ) : null}

        <section className="partner-property-manager__catalogue">
          <div>
            <p className="hotel-page__eyebrow">Property catalogue</p>
            <h2>{isLoading ? 'Loading properties…' : `${properties.length} properties`}</h2>
          </div>
          {properties.map((property) => (
            <Card className="partner-property-manager__property" key={property.id}>
              <div className="partner-property-manager__property-heading">
                <div>
                  <span
                    className={`partner-property-manager__status partner-property-manager__status--${property.publicationStatus.toLowerCase()}`}
                  >
                    {property.publicationStatus}
                  </span>
                  <h2>{property.displayName}</h2>
                  <p>
                    {property.city}, {property.state} · {property.starRating} star ·{' '}
                    {property.rooms.length} room types
                  </p>
                </div>
                <div className="manage-booking__document-actions">
                  {property.publicationStatus === 'PUBLISHED' ? (
                    <Link
                      className="ui-button ui-button--secondary"
                      href={`/hotels/${property.hotelSlug}`}
                    >
                      View live listing
                    </Link>
                  ) : null}
                  {canManage ? (
                    <button
                      className="ui-button ui-button--secondary"
                      disabled={isSaving}
                      onClick={() => void changePublication(property)}
                      type="button"
                    >
                      {property.publicationStatus === 'PUBLISHED'
                        ? 'Pause sales'
                        : 'Publish property'}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="partner-property-manager__rooms">
                {property.rooms.map((room) => (
                  <div key={room.id}>
                    <strong>{room.name}</strong>
                    <span>
                      {room.inventoryCount} rooms · ₹{room.nightlyRate.toLocaleString('en-IN')} + ₹
                      {room.taxesAndFees.toLocaleString('en-IN')} taxes
                    </span>
                    <small>
                      {room.ratePlanName} · {room.mealPlan.replaceAll('-', ' ')}
                    </small>
                  </div>
                ))}
                {property.rooms.length === 0 ? (
                  <p>No room types yet. This draft is not visible to customers.</p>
                ) : null}
              </div>
              {canManage ? (
                <button
                  className="home-card__link partner-property-manager__add-room"
                  onClick={() =>
                    setActiveRoomForm(activeRoomForm === property.id ? undefined : property.id)
                  }
                  type="button"
                >
                  {activeRoomForm === property.id ? 'Close room form' : 'Add room type and rate'}
                </button>
              ) : null}
              {activeRoomForm === property.id ? (
                <form
                  className="supplier-form partner-property-manager__room-form"
                  onSubmit={(event) => void createRoom(event, property)}
                >
                  <div className="booking-confirmation__reference">
                    <span>Step 2</span>
                    <strong>Room and opening rate</strong>
                  </div>
                  <div className="supplier-form__grid">
                    <Input label="Room name" maxLength={120} minLength={2} name="name" required />
                    <Input
                      label="Bed configuration"
                      maxLength={160}
                      name="bedDescription"
                      placeholder="1 king bed"
                      required
                    />
                    <Input
                      defaultValue="10"
                      label="Number of rooms"
                      max={500}
                      min={1}
                      name="inventoryCount"
                      required
                      type="number"
                    />
                    <Input
                      defaultValue="2"
                      label="Maximum adults"
                      max={20}
                      min={1}
                      name="maximumAdults"
                      required
                      type="number"
                    />
                    <Input
                      defaultValue="1"
                      label="Maximum children"
                      max={20}
                      min={0}
                      name="maximumChildren"
                      required
                      type="number"
                    />
                    <Input
                      defaultValue="3"
                      label="Maximum guests"
                      max={30}
                      min={1}
                      name="maximumGuests"
                      required
                      type="number"
                    />
                    <Input
                      label="Nightly rate (INR)"
                      max={5000000}
                      min={100}
                      name="nightlyRate"
                      required
                      type="number"
                    />
                    <Input
                      defaultValue="0"
                      label="Taxes and fees (INR)"
                      max={1000000}
                      min={0}
                      name="taxesAndFees"
                      required
                      type="number"
                    />
                    <Input
                      defaultValue="Best available rate"
                      label="Rate plan name"
                      maxLength={100}
                      name="ratePlanName"
                      required
                    />
                    <label className="ui-field">
                      <span className="ui-field__label">Meal plan</span>
                      <select className="ui-input" defaultValue="room-only" name="mealPlan">
                        <option value="room-only">Room only</option>
                        <option value="breakfast-included">Breakfast included</option>
                        <option value="half-board">Half board</option>
                        <option value="full-board">Full board</option>
                      </select>
                    </label>
                    <Input
                      label="Room amenities"
                      name="amenities"
                      placeholder="Air conditioning, TV, Balcony"
                    />
                    <Input
                      label="Room photo URL (optional)"
                      name="imageUrl"
                      placeholder="Secure images.unsplash.com URL"
                      type="url"
                    />
                  </div>
                  <label className="ui-field">
                    <span className="ui-field__label">Room description</span>
                    <textarea
                      className="ui-input supplier-form__textarea"
                      maxLength={800}
                      minLength={20}
                      name="description"
                      required
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-field__label">Cancellation policy</span>
                    <textarea
                      className="ui-input supplier-form__textarea"
                      maxLength={300}
                      minLength={10}
                      name="cancellationDescription"
                      required
                    />
                  </label>
                  <label className="supplier-form__check">
                    <input defaultChecked name="refundable" type="checkbox" /> This rate is
                    refundable under the stated policy
                  </label>
                  <Button fullWidth isLoading={isSaving} type="submit" variant="primary">
                    Add room and publish property
                  </Button>
                </form>
              ) : null}
            </Card>
          ))}
          {!isLoading && properties.length === 0 ? (
            <Card>
              <strong>No properties yet.</strong>
              <p>Create the first property above, then add its room and rate.</p>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
