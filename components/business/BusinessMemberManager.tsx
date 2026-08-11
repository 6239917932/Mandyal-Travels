'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type BusinessMember = {
  email: string;
  id: string;
  name: string;
  role: string;
};

type BusinessMemberManagerProps = { members: BusinessMember[] };

export function BusinessMemberManager({ members }: BusinessMemberManagerProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string>();

  async function addTraveller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setIsAdding(true);

    const response = await fetch('/api/v1/business/members', {
      body: JSON.stringify({ email: data.get('email') }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = (await response.json()) as { error?: string };
    setIsAdding(false);

    if (!response.ok) {
      setError(result.error ?? 'The traveller could not be added.');
      return;
    }

    form.reset();
    router.refresh();
  }

  async function removeTraveller(member: BusinessMember) {
    if (!window.confirm(`Remove ${member.name} from this organization?`)) return;
    setError('');
    setRemovingId(member.id);

    const response = await fetch(`/api/v1/business/members/${encodeURIComponent(member.id)}`, {
      method: 'DELETE',
    });
    const result = (await response.json()) as { error?: string };
    setRemovingId(undefined);

    if (!response.ok) {
      setError(result.error ?? 'The traveller could not be removed.');
      return;
    }

    router.refresh();
  }

  return (
    <>
      <Card>
        <form className="booking-page__guest-form" onSubmit={addTraveller}>
          <Input
            label="Traveller account email"
            name="email"
            placeholder="traveller@example.com"
            required
            type="email"
          />
          <p className="booking-confirmation__note">
            The traveller must already have an individual Mandyal customer account.
          </p>
          <Button isLoading={isAdding} type="submit" variant="primary">
            Add traveller
          </Button>
          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Card>

      <div className="account-trips__list">
        {members.map((member) => (
          <Card className="account-trip" key={member.id}>
            <div className="account-trip__topline">
              <span className="account-trip__type">{member.role}</span>
              <strong>{member.role === 'ADMIN' ? 'Administrator' : 'Traveller'}</strong>
            </div>
            <div className="account-trip__body">
              <div>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>
              {member.role === 'TRAVELLER' ? (
                <div className="account-trip__actions">
                  <Button
                    isLoading={removingId === member.id}
                    onClick={() => removeTraveller(member)}
                    variant="secondary"
                  >
                    Remove traveller
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
