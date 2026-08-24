'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import { type UserAccessStatus, userAccessConfirmation } from '@/services/adminUserAccessRules';

type ResponseBody = { error?: string };

export function AdminUserAccessManager({
  accessStatus,
  accessVersion,
  isCurrentAdministrator,
  isLastActiveAdministrator,
  userEmail,
  userId,
}: {
  accessStatus: UserAccessStatus;
  accessVersion: number;
  isCurrentAdministrator: boolean;
  isLastActiveAdministrator: boolean;
  userEmail: string;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const action = accessStatus === 'ACTIVE' ? 'SUSPEND' : 'RESTORE';
  const confirmation = userAccessConfirmation(action, userEmail);
  const blocked = action === 'SUSPEND' && (isCurrentAdministrator || isLastActiveAdministrator);

  async function updateAccess(formData: FormData) {
    setError('');
    setMessage('');
    setPending(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/access`, {
        body: JSON.stringify({
          action,
          confirmation: formData.get('confirmation'),
          expectedVersion: accessVersion,
          reason: formData.get('reason'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<ResponseBody>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'Account access could not be updated.');
        return;
      }
      setMessage(action === 'SUSPEND' ? 'Account access suspended.' : 'Account access restored.');
      router.refresh();
    } catch {
      setError('The account-access service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={updateAccess} className="supplier-form">
      <p>
        {action === 'SUSPEND'
          ? 'Suspension immediately revokes every browser session and blocks new sign-ins.'
          : 'Restoration permits future sign-ins but does not recreate revoked sessions.'}
      </p>
      {isCurrentAdministrator && action === 'SUSPEND' ? (
        <p className="booking-page__payment-error" role="status">
          You cannot suspend the administrator account used for this session.
        </p>
      ) : null}
      {isLastActiveAdministrator && action === 'SUSPEND' ? (
        <p className="booking-page__payment-error" role="status">
          The final active platform administrator cannot be suspended.
        </p>
      ) : null}
      <label className="ui-field">
        <span className="ui-field__label">Operational reason</span>
        <textarea
          className="ui-input"
          disabled={blocked}
          maxLength={500}
          minLength={10}
          name="reason"
          required
        />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">
          Type <strong>{confirmation}</strong> to confirm
        </span>
        <input
          autoComplete="off"
          className="ui-input"
          disabled={blocked}
          name="confirmation"
          required
        />
      </label>
      <button
        className={`ui-button ${action === 'SUSPEND' ? 'ui-button--secondary' : 'ui-button--primary'}`}
        disabled={blocked || pending}
        type="submit"
      >
        {pending ? 'Saving…' : action === 'SUSPEND' ? 'Suspend account' : 'Restore account'}
      </button>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="flight-passenger-form__success" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
