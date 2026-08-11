'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

type BusinessInvitationAcceptanceProps = {
  organizationName: string;
  token: string;
};

export function BusinessInvitationAcceptance({
  organizationName,
  token,
}: BusinessInvitationAcceptanceProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  async function acceptInvitation() {
    setError('');
    setIsAccepting(true);

    try {
      const response = await fetch(
        `/api/v1/business/invitations/accept/${encodeURIComponent(token)}`,
        { method: 'POST' },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};

      if (!response.ok) {
        setError(result.error ?? 'The invitation could not be accepted.');
        return;
      }

      router.push('/account#company-travel-request');
      router.refresh();
    } catch {
      setError('The invitation service could not be reached. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="business-invitation__actions">
      <Button isLoading={isAccepting} onClick={acceptInvitation} variant="primary">
        Join {organizationName}
      </Button>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
