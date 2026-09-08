'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';
import type { ApiErrorResponse } from '@/types/commerce';

export function NightAuditCloseForm({
  businessDate,
  propertyId,
  version,
}: {
  businessDate: string;
  propertyId: string;
  version: number;
}) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/partner/night-audit', {
        body: JSON.stringify({
          businessDate,
          confirmation: form.get('confirmation'),
          note: form.get('note'),
          propertyId,
          version,
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey.current,
        },
        method: 'POST',
      });
      const result = await readJsonResponse<
        { data: { nextBusinessDate: string } } | ApiErrorResponse
      >(response);
      if (!response.ok || !result || !('data' in result)) {
        setError(
          result && 'error' in result
            ? result.error.message
            : 'The operational date could not be closed.',
        );
        return;
      }
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } catch {
      setError('The night audit service could not be reached. You can safely retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="supplier-form__grid" onSubmit={submit}>
      <Input
        autoComplete="off"
        label="Confirm operational date"
        maxLength={10}
        name="confirmation"
        required
      />
      <p className="supplier-form__full-width">
        Type {businessDate} exactly. This close cannot be edited or deleted.
      </p>
      <Input
        label="Close note"
        maxLength={300}
        minLength={8}
        name="note"
        placeholder="All departments reconciled"
        required
      />
      <Button className="supplier-form__full-width" isLoading={saving} type="submit">
        Close {businessDate} and open the next date
      </Button>
      {error ? (
        <p className="ui-field__error supplier-form__full-width" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
