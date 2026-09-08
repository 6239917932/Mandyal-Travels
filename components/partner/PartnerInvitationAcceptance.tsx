'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

export function PartnerInvitationAcceptance({
  partnerName,
  token,
}: {
  partnerName: string;
  token: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  async function acceptInvitation() {
    setError('');
    setIsAccepting(true);
    try {
      const response = await fetch(
        `/api/v1/partner/invitations/accept/${encodeURIComponent(token)}`,
        { method: 'POST' },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The supplier invitation could not be accepted.');
        return;
      }
      router.push('/partner/access');
      router.refresh();
    } catch {
      setError('The supplier access service could not be reached. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="business-invitation__actions">
      <Button isLoading={isAccepting} onClick={acceptInvitation} variant="primary">
        Join {partnerName}
      </Button>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
