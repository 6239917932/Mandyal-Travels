'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readJsonResponse } from '@/lib/api/clientResponse';

export type AgencyCustomerView = {
  displayName: string;
  email: string;
  id: string;
  notes: string;
  phone: string;
  requestCount: number;
  status: string;
};

type CustomerResponse = {
  data?: { customer: Omit<AgencyCustomerView, 'requestCount'> };
  error?: string;
};

export function AgencyCustomerManager({
  initialCustomers,
}: {
  initialCustomers: AgencyCustomerView[];
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [message, setMessage] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingId('new');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/agent/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const result = await readJsonResponse<CustomerResponse>(response);
    const created = result?.data?.customer;
    if (response.ok && created) {
      setCustomers((current) => [{ ...created, requestCount: 0 }, ...current]);
      setMessage('Customer profile added to the agency workspace.');
      event.currentTarget.reset();
      router.refresh();
    } else {
      setMessage(result?.error ?? 'Customer could not be added.');
    }
    setPendingId(null);
  }

  async function updateCustomer(event: FormEvent<HTMLFormElement>, customerId: string) {
    event.preventDefault();
    setPendingId(customerId);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/agent/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const result = await readJsonResponse<CustomerResponse>(response);
    const updated = result?.data?.customer;
    if (response.ok && updated) {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? { ...updated, requestCount: customer.requestCount }
            : customer,
        ),
      );
      setMessage('Customer profile updated.');
      router.refresh();
    } else {
      setMessage(result?.error ?? 'Customer could not be updated.');
    }
    setPendingId(null);
  }

  return (
    <div className="account-trips">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Customer servicing</p>
        <h2>Agency customers</h2>
        <p>
          Keep profiles current, deactivate customers without deleting history, and retain request
          attribution.
        </p>
      </div>

      <form className="ui-card ui-card--padded" onSubmit={createCustomer}>
        <h3>Add agency customer</h3>
        <p>Store only the contact information needed to prepare and service travel.</p>
        <input
          aria-label="New customer name"
          className="ui-input"
          name="displayName"
          placeholder="Customer name"
          required
        />
        <input
          aria-label="New customer email"
          className="ui-input"
          name="email"
          placeholder="Email"
          required
          type="email"
        />
        <input
          aria-label="New customer phone"
          className="ui-input"
          name="phone"
          placeholder="Phone (optional)"
        />
        <textarea
          aria-label="New customer service notes"
          className="ui-input"
          maxLength={500}
          name="notes"
          placeholder="Service notes (optional)"
        />
        <button className="ui-button ui-button--accent" disabled={pendingId === 'new'}>
          {pendingId === 'new' ? 'Adding…' : 'Add customer'}
        </button>
      </form>

      {message ? <p role="status">{message}</p> : null}

      <div className="booking-summary-grid">
        {customers.map((customer) => (
          <form
            className="ui-card ui-card--padded"
            key={customer.id}
            onSubmit={(event) => updateCustomer(event, customer.id)}
          >
            <div>
              <strong>{customer.requestCount}</strong> linked travel request
              {customer.requestCount === 1 ? '' : 's'}
            </div>
            <label>
              Customer name
              <input
                className="ui-input"
                defaultValue={customer.displayName}
                maxLength={120}
                name="displayName"
                required
              />
            </label>
            <label>
              Email
              <input
                className="ui-input"
                defaultValue={customer.email}
                maxLength={254}
                name="email"
                required
                type="email"
              />
            </label>
            <label>
              Phone
              <input
                className="ui-input"
                defaultValue={customer.phone}
                maxLength={30}
                name="phone"
              />
            </label>
            <label>
              Service notes
              <textarea
                className="ui-input"
                defaultValue={customer.notes}
                maxLength={500}
                name="notes"
              />
            </label>
            <label>
              Status
              <select className="ui-input" defaultValue={customer.status} name="status">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <button className="ui-button ui-button--secondary" disabled={pendingId === customer.id}>
              {pendingId === customer.id ? 'Saving…' : 'Save customer'}
            </button>
          </form>
        ))}
      </div>
      {customers.length === 0 ? <p>No agency customers have been added yet.</p> : null}
    </div>
  );
}
