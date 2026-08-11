'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { readJsonResponse } from '@/lib/api/clientResponse';

interface AccountSession {
  createdAt: string;
  expiresAt: string;
  id: string;
  isCurrent: boolean;
  lastSeenAt: string;
}

interface SessionManagerProps {
  sessions: AccountSession[];
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SessionManager({ sessions }: SessionManagerProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const otherSessionCount = sessions.filter((session) => !session.isCurrent).length;

  async function revokeOtherSessions() {
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/account/sessions', { method: 'DELETE' });
      const result =
        (await readJsonResponse<{ data?: { revokedSessions?: number }; error?: string }>(response)) ??
        {};

      if (!response.ok) {
        setError(result.error ?? 'Other sessions could not be signed out.');
        return;
      }

      const revokedSessions = result.data?.revokedSessions ?? 0;
      setMessage(
        revokedSessions === 1
          ? '1 other session was signed out.'
          : `${revokedSessions} other sessions were signed out.`,
      );
      router.refresh();
    } catch {
      setError('The account service could not be reached. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="account-trips" aria-labelledby="active-sessions-heading">
      <div className="account-trips__heading">
        <p className="hotel-page__eyebrow">Account security</p>
        <h2 id="active-sessions-heading">Active sessions</h2>
        <p>Review where this account is signed in and remove access from other sessions.</p>
      </div>
      <div className="account-trips__list">
        {sessions.map((session) => (
          <Card className="account-session" key={session.id}>
            <div>
              <strong>{session.isCurrent ? 'This session' : 'Another signed-in session'}</strong>
              <span>Last active {formatSessionDate(session.lastSeenAt)}</span>
            </div>
            <dl>
              <div>
                <dt>Signed in</dt>
                <dd>{formatSessionDate(session.createdAt)}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{formatSessionDate(session.expiresAt)}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
      <div className="account-session__actions">
        <Button
          disabled={otherSessionCount === 0}
          isLoading={isSubmitting}
          onClick={revokeOtherSessions}
          variant="secondary"
        >
          Sign out other sessions
        </Button>
        <span>
          {otherSessionCount === 0
            ? 'No other active sessions.'
            : `${otherSessionCount} other active ${otherSessionCount === 1 ? 'session' : 'sessions'}.`}
        </span>
      </div>
      {message ? (
        <p className="auth-form__success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
