'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

type Values = {
  bags: number;
  cancellationPolicy: string;
  category: string;
  dropoffLocation: string;
  features: string;
  fuelPolicy: string;
  mileagePolicy: string;
  pickupLocation: string;
  pricePerDay: number;
  registrationNumber: string;
  seats: number;
  totalUnits: number;
  transmission: string;
  updatedAt: string;
  vehicleName: string;
};

export function AdminVehicleListingEditor({
  partnerId,
  vehicleId,
  values,
}: {
  partnerId: string;
  vehicleId: string;
  values: Values;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/partners/${partnerId}/vehicles/${vehicleId}`, {
        body: JSON.stringify({
          action: 'UPDATE_LISTING',
          ...Object.fromEntries(new FormData(event.currentTarget)),
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
      setError('The vehicle editor could not reach the server.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="supplier-form">
      <summary>Edit complete vehicle listing</summary>
      <form className="auth-form" onSubmit={submit}>
        <input name="expectedUpdatedAt" type="hidden" value={values.updatedAt} />
        <p className="business-policy__note">
          Saving any change returns this vehicle to draft and requires a fresh approval.
        </p>
        <div className="auth-form__row">
          <Input
            defaultValue={values.vehicleName}
            label="Vehicle or fleet name"
            maxLength={120}
            name="vehicleName"
            required
          />
          <Input
            defaultValue={values.category}
            label="Category"
            maxLength={80}
            name="category"
            required
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.registrationNumber}
            label="Registration number"
            maxLength={30}
            name="registrationNumber"
            required
          />
          <label className="ui-field">
            <span className="ui-field__label">Transmission</span>
            <select className="ui-input" defaultValue={values.transmission} name="transmission">
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </label>
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.pickupLocation}
            label="Pickup location"
            maxLength={80}
            name="pickupLocation"
            required
          />
          <Input
            defaultValue={values.dropoffLocation}
            label="Drop-off location"
            maxLength={80}
            name="dropoffLocation"
            required
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.seats}
            label="Seats"
            max="20"
            min="1"
            name="seats"
            required
            type="number"
          />
          <Input
            defaultValue={values.bags}
            label="Bags"
            max="20"
            min="0"
            name="bags"
            required
            type="number"
          />
        </div>
        <div className="auth-form__row">
          <Input
            defaultValue={values.totalUnits}
            label="Fleet units"
            max="500"
            min="1"
            name="totalUnits"
            required
            type="number"
          />
          <Input
            defaultValue={values.pricePerDay}
            label="Price per day (INR)"
            max="1000000"
            min="100"
            name="pricePerDay"
            required
            type="number"
          />
        </div>
        <Input
          defaultValue={values.features}
          label="Features (comma separated)"
          maxLength={800}
          name="features"
        />
        <Input
          defaultValue={values.fuelPolicy}
          label="Fuel policy"
          maxLength={120}
          name="fuelPolicy"
          required
        />
        <Input
          defaultValue={values.mileagePolicy}
          label="Mileage policy"
          maxLength={120}
          name="mileagePolicy"
          required
        />
        <label className="ui-field">
          <span className="ui-field__label">Cancellation policy</span>
          <textarea
            className="ui-input supplier-form__compact-textarea"
            defaultValue={values.cancellationPolicy}
            maxLength={240}
            name="cancellationPolicy"
            required
          />
        </label>
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
