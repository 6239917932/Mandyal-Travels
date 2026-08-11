'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type BusinessMember = {
  email: string;
  id: string;
  isCurrentUser: boolean;
  name: string;
  role: string;
};

type BusinessInvitation = {
  email: string;
  expiresAt: string;
  id: string;
};

type BusinessMemberManagerProps = {
  invitations: BusinessInvitation[];
  members: BusinessMember[];
};

export function BusinessMemberManager({ invitations, members }: BusinessMemberManagerProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [roleChangingId, setRoleChangingId] = useState<string>();
  const [removingId, setRemovingId] = useState<string>();
  const [revokingId, setRevokingId] = useState<string>();

  async function inviteTraveller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setInvitationUrl('');
    setMessage('');
    setIsAdding(true);

    try {
      const response = await fetch('/api/v1/business/invitations', {
        body: JSON.stringify({ email: data.get('email') }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const responseText = await response.text();
      const result = responseText
        ? (JSON.parse(responseText) as { data?: { acceptPath?: string }; error?: string })
        : {};

      if (!response.ok) {
        setError(result.error ?? 'The traveller invitation could not be created.');
        return;
      }

      const acceptPath = result.data?.acceptPath;
      if (!acceptPath) {
        setError('The invitation was created, but its link could not be displayed.');
        return;
      }

      form.reset();
      setInvitationUrl(`${window.location.origin}${acceptPath}`);
      setMessage('Invitation created. Copy and send this secure link to the traveller.');
      router.refresh();
    } catch {
      setError('The invitation service could not be reached. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage('Invitation link copied.');
    } catch {
      setError('Copy the invitation link manually from the field below.');
    }
  }

  async function revokeInvitation(invitation: BusinessInvitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setError('');
    setRevokingId(invitation.id);

    try {
      const response = await fetch(
        `/api/v1/business/invitations/${encodeURIComponent(invitation.id)}`,
        { method: 'DELETE' },
      );
      const responseText = await response.text();
      const result = responseText ? (JSON.parse(responseText) as { error?: string }) : {};
      if (!response.ok) {
        setError(result.error ?? 'The invitation could not be revoked.');
        return;
      }

      router.refresh();
    } catch {
      setError('The invitation service could not be reached. Please try again.');
    } finally {
      setRevokingId(undefined);
    }
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

  async function updateMemberRole(member: BusinessMember, role: 'ADMIN' | 'TRAVELLER') {
    const action =
      role === 'ADMIN' ? 'promote to organization administrator' : 'change to traveller';
    if (!window.confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)}: ${member.name}?`)) {
      return;
    }

    setError('');
    setMessage('');
    setRoleChangingId(member.id);

    try {
      const response = await fetch(`/api/v1/business/members/${encodeURIComponent(member.id)}`, {
        body: JSON.stringify({ role }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const responseText = await response.text();
      const result = responseText ? (JSON.parse(responseText) as { error?: string }) : {};
      if (!response.ok) {
        setError(result.error ?? 'The member access could not be changed.');
        return;
      }

      setMessage(
        role === 'ADMIN'
          ? `${member.name} is now an organization administrator.`
          : `${member.name} now has traveller access.`,
      );
      router.refresh();
    } catch {
      setError('The organization access service could not be reached. Please try again.');
    } finally {
      setRoleChangingId(undefined);
    }
  }

  return (
    <>
      <Card>
        <form className="booking-page__guest-form" onSubmit={inviteTraveller}>
          <Input
            label="Traveller account email"
            name="email"
            placeholder="traveller@example.com"
            required
            type="email"
          />
          <p className="booking-confirmation__note">
            The secure invitation works for existing customers and people who still need to create
            an individual traveller account. It expires after seven days.
          </p>
          <Button isLoading={isAdding} type="submit" variant="primary">
            Create traveller invitation
          </Button>
          {invitationUrl ? (
            <div className="business-invitation-link">
              <label className="ui-field__label" htmlFor="new-business-invitation-link">
                Secure invitation link
              </label>
              <div>
                <input
                  className="ui-input"
                  id="new-business-invitation-link"
                  readOnly
                  value={invitationUrl}
                />
                <Button onClick={copyInvitationLink} type="button" variant="secondary">
                  Copy link
                </Button>
              </div>
              <small>
                This link is displayed only now. Revoke and create a new one if it is lost.
              </small>
            </div>
          ) : null}
          {message ? (
            <p className="business-policy__success" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Card>

      {invitations.length > 0 ? (
        <div className="account-trips__list">
          {invitations.map((invitation) => (
            <Card className="account-trip" key={invitation.id}>
              <div className="account-trip__topline">
                <span className="account-trip__type">PENDING INVITATION</span>
                <strong>
                  Expires {new Date(invitation.expiresAt).toLocaleDateString('en-IN')}
                </strong>
              </div>
              <div className="account-trip__body">
                <div>
                  <h3>{invitation.email}</h3>
                  <p>Waiting for the traveller to accept.</p>
                </div>
                <div className="account-trip__actions">
                  <Button
                    isLoading={revokingId === invitation.id}
                    onClick={() => revokeInvitation(invitation)}
                    variant="secondary"
                  >
                    Revoke invitation
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

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
                    isLoading={roleChangingId === member.id}
                    onClick={() => updateMemberRole(member, 'ADMIN')}
                    variant="primary"
                  >
                    Promote to administrator
                  </Button>
                  <Button
                    isLoading={removingId === member.id}
                    onClick={() => removeTraveller(member)}
                    variant="secondary"
                  >
                    Remove traveller
                  </Button>
                </div>
              ) : !member.isCurrentUser ? (
                <div className="account-trip__actions">
                  <Button
                    isLoading={roleChangingId === member.id}
                    onClick={() => updateMemberRole(member, 'TRAVELLER')}
                    variant="secondary"
                  >
                    Change to traveller
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
