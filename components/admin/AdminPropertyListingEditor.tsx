'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export type AdminPropertyListingValues = {
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
  childrenAllowed: boolean;
  city: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  description: string;
  displayName: string;
  district: string;
  imageUrl: string;
  imageUrls: string;
  landmarks: string;
  languages: string;
  latitude: number;
  locality: string;
  locationAliases: string;
  longitude: number;
  minimumCheckInAge: number;
  petsAllowed: boolean;
  policies: string;
  postalCode: string;
  propertyType: string;
  smokingAllowed: boolean;
  starRating: number;
  state: string;
  streetAddress: string;
  tehsil: string;
  updatedAt: string;
};

export function AdminPropertyListingEditor({
  partnerId,
  propertyId,
  values,
}: {
  partnerId: string;
  propertyId: string;
  values: AdminPropertyListingValues;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}/properties/${propertyId}`, {
        body: JSON.stringify({
          ...payload,
          action: 'UPDATE_LISTING',
          childrenAllowed: form.has('childrenAllowed'),
          petsAllowed: form.has('petsAllowed'),
          smokingAllowed: form.has('smokingAllowed'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<{ data: { id: string } } | ApiErrorResponse>(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'Listing changes could not be saved.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('The property editor could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="supplier-form">
      <summary>Edit complete property listing</summary>
      <form className="auth-form" onSubmit={submit}>
        <input name="expectedUpdatedAt" type="hidden" value={values.updatedAt} />
        <p className="business-policy__note">
          Saving any change returns this listing to draft and requires a fresh approval.
        </p>
        <div className="auth-form__row">
          <Input
            defaultValue={values.displayName}
            label="Property name"
            maxLength={140}
            name="displayName"
            required
          />
          <label className="ui-field">
            <span className="ui-field__label">Property type</span>
            <select className="ui-input" defaultValue={values.propertyType} name="propertyType">
              {['HOTEL', 'RESORT', 'HOMESTAY', 'GUEST_HOUSE', 'APARTMENT', 'HOSTEL'].map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Description</span>
          <textarea
            className="ui-input partner-application__textarea"
            defaultValue={values.description}
            maxLength={1500}
            minLength={30}
            name="description"
            required
          />
        </label>
        <div className="auth-form__row">
          <Input
            defaultValue={values.contactEmail}
            label="Guest-facing email"
            maxLength={254}
            name="contactEmail"
            required
            type="email"
          />
          <Input
            defaultValue={values.contactPhone}
            label="Guest-facing phone"
            maxLength={30}
            name="contactPhone"
            required
            type="tel"
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.locality}
            label="Locality"
            maxLength={100}
            name="locality"
            required
          />
          <Input defaultValue={values.tehsil} label="Tehsil" maxLength={80} name="tehsil" />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.city}
            label="City or town"
            maxLength={80}
            name="city"
            required
          />
          <Input
            defaultValue={values.district}
            label="District"
            maxLength={80}
            name="district"
            required
          />
        </div>
        <div className="auth-form__row">
          <Input defaultValue={values.state} label="State" maxLength={80} name="state" required />
          <Input
            defaultValue={values.country}
            label="Country"
            maxLength={80}
            name="country"
            required
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.streetAddress}
            label="Street address"
            maxLength={240}
            name="streetAddress"
            required
          />
          <Input
            defaultValue={values.postalCode}
            label="Postal code"
            maxLength={20}
            name="postalCode"
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.latitude}
            label="Latitude"
            max="90"
            min="-90"
            name="latitude"
            required
            step="any"
            type="number"
          />
          <Input
            defaultValue={values.longitude}
            label="Longitude"
            max="180"
            min="-180"
            name="longitude"
            required
            step="any"
            type="number"
          />
        </div>
        <Input
          defaultValue={values.locationAliases}
          label="Search aliases (comma separated)"
          maxLength={500}
          name="locationAliases"
        />
        <div className="auth-form__row">
          <Input
            defaultValue={values.starRating}
            label="Star rating"
            max="5"
            min="1"
            name="starRating"
            required
            type="number"
          />
          <Input
            defaultValue={values.minimumCheckInAge}
            label="Minimum check-in age"
            max="30"
            min="16"
            name="minimumCheckInAge"
            required
            type="number"
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.checkInTime}
            label="Check-in time"
            name="checkInTime"
            required
            type="time"
          />
          <Input
            defaultValue={values.checkOutTime}
            label="Check-out time"
            name="checkOutTime"
            required
            type="time"
          />
        </div>
        <Input
          defaultValue={values.imageUrl}
          label="Primary image URL"
          maxLength={1000}
          name="imageUrl"
          required
          type="url"
        />
        <label className="ui-field">
          <span className="ui-field__label">Additional image URLs (one per line)</span>
          <textarea
            className="ui-input supplier-form__compact-textarea"
            defaultValue={values.imageUrls}
            maxLength={8000}
            name="imageUrls"
          />
        </label>
        <Input
          defaultValue={values.amenities}
          label="Amenities (comma separated)"
          maxLength={2000}
          name="amenities"
        />
        <Input
          defaultValue={values.languages}
          label="Languages (comma separated)"
          maxLength={500}
          name="languages"
        />
        <label className="ui-field">
          <span className="ui-field__label">Landmarks (one per line)</span>
          <textarea
            className="ui-input supplier-form__compact-textarea"
            defaultValue={values.landmarks}
            maxLength={1500}
            name="landmarks"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Policies (one per line)</span>
          <textarea
            className="ui-input supplier-form__compact-textarea"
            defaultValue={values.policies}
            maxLength={3000}
            name="policies"
          />
        </label>
        <div className="manage-booking__document-actions">
          <label className="supplier-form__checkbox">
            <input defaultChecked={values.childrenAllowed} name="childrenAllowed" type="checkbox" />
            <span>Children allowed</span>
          </label>
          <label className="supplier-form__checkbox">
            <input defaultChecked={values.petsAllowed} name="petsAllowed" type="checkbox" />
            <span>Pets allowed</span>
          </label>
          <label className="supplier-form__checkbox">
            <input defaultChecked={values.smokingAllowed} name="smokingAllowed" type="checkbox" />
            <span>Smoking allowed</span>
          </label>
        </div>
        {error ? (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <Button isLoading={saving} type="submit" variant="accent">
          Save and return to review
        </Button>
      </form>
    </details>
  );
}
