'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AgencyCustomerView } from '@/components/agent/AgencyCustomerManager';
import { BusinessRequestCheckoutLink } from '@/components/business/BusinessRequestCheckoutLink';
import { readJsonResponse } from '@/lib/api/clientResponse';

export type AgencyTravelRequestView = {
  customerName: string;
  estimatedAmount: number;
  id: string;
  productType: string;
  startDate: string;
  status: string;
  title: string;
};

type RequestResponse = {
  data?: {
    customerName: string;
    request: Omit<AgencyTravelRequestView, 'customerName'>;
  };
  error?: string;
};

export function AgencyTravelRequestManager({
  customers,
  initialRequests,
  organizationName,
}: {
  customers: AgencyCustomerView[];
  initialRequests: AgencyTravelRequestView[];
  organizationName: string;
}) {
  const router = useRouter();
  const activeCustomers = customers.filter((customer) => customer.status === 'ACTIVE');
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const body: Record<string, FormDataEntryValue | number> = Object.fromEntries(form);
    body.estimatedAmount = Number(body.estimatedAmount);
    const response = await fetch('/api/v1/agent/travel-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
    const result = await readJsonResponse<RequestResponse>(response);
    if (response.ok && result?.data) {
      const created = result.data;
      setRequests((current) => [
        { ...created.request, customerName: created.customerName },
        ...current,
      ]);
      setMessage('Customer travel request created and evaluated against the agency policy.');
      event.currentTarget.reset();
      router.refresh();
    } else {
      setMessage(result?.error ?? 'The customer travel request could not be created.');
    }
    setPending(false);
  }

  return (
    <div className="account-trips">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Booking controls</p>
        <h2>Customer travel requests</h2>
        <p>Create an attributable request before searching and booking for an agency customer.</p>
      </div>

      <form className="ui-card ui-card--padded" onSubmit={submit}>
        <label>
          Agency customer
          <select className="ui-input" name="agencyCustomerId" required>
            <option value="">Select customer</option>
            {activeCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName} — {customer.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product
          <select className="ui-input" name="productType" required>
            <option value="HOTEL">Hotel</option>
            <option value="FLIGHT">Flight</option>
            <option value="BUS">Bus</option>
            <option value="CAR">Car</option>
          </select>
        </label>
        <label>
          Trip purpose or destination
          <input className="ui-input" maxLength={160} name="title" required />
        </label>
        <label>
          Start date
          <input className="ui-input" name="startDate" required type="date" />
        </label>
        <label>
          End date (required for hotels and cars)
          <input className="ui-input" name="endDate" type="date" />
        </label>
        <label>
          Estimated amount (INR)
          <input
            className="ui-input"
            max={10000000}
            min={1}
            name="estimatedAmount"
            required
            type="number"
          />
        </label>
        <button
          className="ui-button ui-button--accent"
          disabled={pending || activeCustomers.length === 0}
        >
          {pending ? 'Creating…' : 'Create customer request'}
        </button>
        {activeCustomers.length === 0 ? (
          <p>Add or reactivate a customer before creating a request.</p>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </form>

      <div className="booking-summary-grid">
        {requests.map((request) => (
          <article className="ui-card ui-card--padded" key={request.id}>
            <p className="hotel-page__eyebrow">
              {request.productType} · {request.status}
            </p>
            <h3>{request.title}</h3>
            <p>{request.customerName}</p>
            <p>
              {request.startDate} ·{' '}
              {new Intl.NumberFormat('en-IN', {
                currency: 'INR',
                maximumFractionDigits: 0,
                style: 'currency',
              }).format(request.estimatedAmount)}
            </p>
            <div className="account-trip__actions">
              {request.status === 'APPROVED' && isBusinessProduct(request.productType) ? (
                <BusinessRequestCheckoutLink
                  id={request.id}
                  organizationName={organizationName}
                  productType={request.productType}
                  title={request.title}
                />
              ) : null}
              <Link
                className="ui-button ui-button--secondary"
                href={`/business/requests/${request.id}`}
              >
                View request record
              </Link>
            </div>
            {request.status === 'PENDING' ? (
              <p className="business-request__guidance">
                Approve this request in Agency operations before booking.
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {requests.length === 0 ? <p>No customer travel requests have been created yet.</p> : null}
    </div>
  );
}

function isBusinessProduct(productType: string): productType is 'FLIGHT' | 'HOTEL' | 'BUS' | 'CAR' {
  return ['FLIGHT', 'HOTEL', 'BUS', 'CAR'].includes(productType);
}
