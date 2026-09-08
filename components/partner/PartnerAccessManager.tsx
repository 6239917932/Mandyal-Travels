'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { readJsonResponse } from '@/lib/api/clientResponse';

type Member = {
  email: string;
  id: string;
  isCurrentUser: boolean;
  name: string;
  role: string;
};

type Invitation = { email: string; expiresAt: string; id: string; role: string };

export function PartnerAccessManager({
  canManage,
  invitations,
  members,
}: {
  canManage: boolean;
  invitations: Invitation[];
  members: Member[];
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingId, setPendingId] = useState<string>();

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setMessage('');
    setInvitationUrl('');
    setIsInviting(true);
    try {
      const response = await fetch('/api/v1/partner/invitations', {
        body: JSON.stringify({ email: data.get('email'), role: data.get('role') }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result =
        (await readJsonResponse<{ data?: { acceptPath?: string }; error?: string }>(response)) ??
        {};
      if (!response.ok) {
        setError(result.error ?? 'The supplier invitation could not be created.');
        return;
      }
      const acceptPath = result.data?.acceptPath;
      if (!acceptPath) {
        setError('The invitation was created, but its secure link could not be displayed.');
        return;
      }
      form.reset();
      setInvitationUrl(`${window.location.origin}${acceptPath}`);
      setMessage('Invitation created. Copy and send this secure link to the team member.');
      router.refresh();
    } catch {
      setError('The supplier access service could not be reached. Please try again.');
    } finally {
      setIsInviting(false);
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

  async function updateMember(member: Member, role: 'ADMIN' | 'OPERATOR') {
    if (!window.confirm(`Change ${member.name} to ${role.toLowerCase()} access?`)) return;
    setPendingId(member.id);
    setError('');
    try {
      const response = await fetch(`/api/v1/partner/members/${encodeURIComponent(member.id)}`, {
        body: JSON.stringify({ role }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The member role could not be changed.');
      else {
        setMessage(`${member.name} now has ${role.toLowerCase()} access.`);
        router.refresh();
      }
    } catch {
      setError('The supplier access service could not be reached. Please try again.');
    } finally {
      setPendingId(undefined);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.name} from this supplier workspace?`)) return;
    setPendingId(member.id);
    setError('');
    try {
      const response = await fetch(`/api/v1/partner/members/${encodeURIComponent(member.id)}`, {
        method: 'DELETE',
      });
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The member could not be removed.');
      else router.refresh();
    } catch {
      setError('The supplier access service could not be reached. Please try again.');
    } finally {
      setPendingId(undefined);
    }
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setPendingId(invitation.id);
    setError('');
    try {
      const response = await fetch(
        `/api/v1/partner/invitations/${encodeURIComponent(invitation.id)}`,
        { method: 'DELETE' },
      );
      const result = (await readJsonResponse<{ error?: string }>(response)) ?? {};
      if (!response.ok) setError(result.error ?? 'The invitation could not be revoked.');
      else router.refresh();
    } catch {
      setError('The supplier access service could not be reached. Please try again.');
    } finally {
      setPendingId(undefined);
    }
  }

  return (
    <>
      {canManage ? (
        <Card>
          <form className="booking-page__guest-form" onSubmit={inviteMember}>
            <Input
              label="Team member email"
              name="email"
              placeholder="operations@example.com"
              required
              type="email"
            />
            <label className="ui-field">
              <span className="ui-field__label">Initial role</span>
              <select className="ui-input" defaultValue="OPERATOR" name="role">
                <option value="OPERATOR">Operator — daily operations</option>
                <option value="ADMIN">Administrator — settings and team access</option>
              </select>
            </label>
            <p className="booking-confirmation__note">
              Invitations expire after seven days. Operators cannot change team access or protected
              supplier settings.
            </p>
            <Button isLoading={isInviting} type="submit" variant="primary">
              Create secure invitation
            </Button>
            {invitationUrl ? (
              <div className="business-invitation-link">
                <label className="ui-field__label" htmlFor="partner-invitation-link">
                  Secure invitation link
                </label>
                <div>
                  <input
                    className="ui-input"
                    id="partner-invitation-link"
                    readOnly
                    value={invitationUrl}
                  />
                  <Button onClick={copyInvitationLink} type="button" variant="secondary">
                    Copy link
                  </Button>
                </div>
                <small>This link is displayed only now. Revoke and replace it if it is lost.</small>
              </div>
            ) : null}
          </form>
        </Card>
      ) : (
        <Card>
          <p>
            Operator access is read-only on this page. Ask a supplier administrator to change team
            membership.
          </p>
        </Card>
      )}

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

      {invitations.map((invitation) => (
        <Card className="account-trip" key={invitation.id}>
          <div className="account-trip__topline">
            <span className="account-trip__type">PENDING {invitation.role}</span>
            <strong>Expires {new Date(invitation.expiresAt).toLocaleDateString('en-IN')}</strong>
          </div>
          <div className="account-trip__body">
            <div>
              <h3>{invitation.email}</h3>
              <p>Waiting for acceptance.</p>
            </div>
            {canManage ? (
              <Button
                isLoading={pendingId === invitation.id}
                onClick={() => revokeInvitation(invitation)}
                variant="secondary"
              >
                Revoke invitation
              </Button>
            ) : null}
          </div>
        </Card>
      ))}

      {members.map((member) => (
        <Card className="account-trip" key={member.id}>
          <div className="account-trip__topline">
            <span className="account-trip__type">{member.role}</span>
            <strong>{member.isCurrentUser ? 'Current account' : 'Active member'}</strong>
          </div>
          <div className="account-trip__body">
            <div>
              <h3>{member.name}</h3>
              <p>{member.email}</p>
            </div>
            {canManage && !member.isCurrentUser ? (
              <div className="account-trip__actions">
                <Button
                  isLoading={pendingId === member.id}
                  onClick={() =>
                    updateMember(member, member.role === 'ADMIN' ? 'OPERATOR' : 'ADMIN')
                  }
                  variant={member.role === 'ADMIN' ? 'secondary' : 'primary'}
                >
                  {member.role === 'ADMIN' ? 'Change to operator' : 'Promote to administrator'}
                </Button>
                {member.role === 'OPERATOR' ? (
                  <Button
                    isLoading={pendingId === member.id}
                    onClick={() => removeMember(member)}
                    variant="secondary"
                  >
                    Remove member
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </>
  );
}
