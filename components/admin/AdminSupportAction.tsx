'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { readJsonResponse } from '@/lib/api/clientResponse';

type AdminSupportActionProps = {
  caseId: string;
  status: string;
};

export function AdminSupportAction({ caseId, status }: AdminSupportActionProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const action = status === 'OPEN' ? 'CLOSE' : 'REOPEN';

  async function updateCase() {
    setError('');
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/v1/admin/support/${encodeURIComponent(caseId)}`, {
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.error ?? 'The support case could not be updated.');
        return;
      }
      router.refresh();
    } catch {
      setError('The support service could not be reached.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="admin-support-action">
      <Button isLoading={isUpdating} onClick={updateCase} variant="secondary">
        {action === 'CLOSE' ? 'Close case' : 'Reopen case'}
      </Button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
