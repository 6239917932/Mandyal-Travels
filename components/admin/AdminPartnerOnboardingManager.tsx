'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';

type ApiResponse = { error?: { message?: string } };

function apiMessage(result: ApiResponse | null, fallback: string) {
  return result?.error?.message ?? fallback;
}

export function AdminOnboardingCouponCreateForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function create(formData: FormData) {
    setPending(true);
    setError('');
    const startsAt = String(formData.get('startsAt') ?? '');
    const endsAt = String(formData.get('endsAt') ?? '');
    try {
      const response = await fetch('/api/v1/admin/partners/onboarding/coupons', {
        body: JSON.stringify({
          active: false,
          code: formData.get('code'),
          description: formData.get('description'),
          endsAt: new Date(endsAt).toISOString(),
          startsAt: new Date(startsAt).toISOString(),
          usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : null,
          waiverPercent: 100,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<ApiResponse>(response);
      if (!response.ok) setError(apiMessage(result, 'Launch coupon creation failed.'));
      else router.refresh();
    } catch {
      setError('The supplier enrollment service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={create} className="supplier-form">
      <div className="supplier-form__grid">
        <label>
          Coupon code
          <input maxLength={40} minLength={3} name="code" pattern="[A-Za-z0-9_-]+" required />
        </label>
        <label>
          Usage limit (optional)
          <input max={10000} min={1} name="usageLimit" type="number" />
        </label>
        <label>
          Starts at
          <input name="startsAt" type="datetime-local" required />
        </label>
        <label>
          Ends at
          <input name="endsAt" type="datetime-local" required />
        </label>
      </div>
      <label>
        Internal purpose
        <textarea maxLength={200} minLength={5} name="description" required />
      </label>
      <p>New coupons are always created paused. Review the dates and cap before activating one.</p>
      <button className="ui-button ui-button--primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create paused 100% waiver'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AdminOnboardingCouponStatus({
  active,
  couponId,
  version,
}: {
  active: boolean;
  couponId: string;
  version: number;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function update(formData: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/partners/onboarding/coupons', {
        body: JSON.stringify({
          active: !active,
          expectedVersion: version,
          id: couponId,
          reason: formData.get('reason'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<ApiResponse>(response);
      if (!response.ok) setError(apiMessage(result, 'Coupon update failed.'));
      else router.refresh();
    } catch {
      setError('The supplier enrollment service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={update} className="admin-finance-actions__form">
      <label>
        Required change reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending}>
        {pending ? 'Saving…' : active ? 'Pause coupon' : 'Activate coupon'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AdminAgreementDraftForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function create(formData: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/partners/onboarding/agreements', {
        body: JSON.stringify({
          content: formData.get('content'),
          creationReason: formData.get('creationReason'),
          title: formData.get('title'),
          version: formData.get('version'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await readJsonResponse<ApiResponse>(response);
      if (!response.ok) setError(apiMessage(result, 'Agreement draft creation failed.'));
      else router.refresh();
    } catch {
      setError('The agreement governance service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={create} className="supplier-form">
      <div className="supplier-form__grid">
        <label>
          Version label
          <input maxLength={40} minLength={3} name="version" pattern="[A-Za-z0-9._-]+" required />
        </label>
        <label>
          Agreement title
          <input maxLength={160} minLength={5} name="title" required />
        </label>
      </div>
      <label>
        Exact agreement text
        <textarea maxLength={100000} minLength={200} name="content" required rows={16} />
      </label>
      <label>
        Draft creation reason
        <textarea maxLength={500} minLength={10} name="creationReason" required />
      </label>
      <p>
        Agreement text becomes immutable after creation. A separate reviewed action is required to
        release it.
      </p>
      <button className="ui-button ui-button--primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create immutable draft'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AdminAgreementLifecycle({
  agreementId,
  governanceVersion,
  status,
  versionLabel,
}: {
  agreementId: string;
  governanceVersion: number;
  status: string;
  versionLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const action = status === 'DRAFT' ? 'APPROVE' : 'RETIRE';

  async function update(formData: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/partners/onboarding/agreements', {
        body: JSON.stringify({
          action,
          confirmation: formData.get('confirmation'),
          expectedVersion: governanceVersion,
          id: agreementId,
          legalApprovalReference: formData.get('legalApprovalReference'),
          reason: formData.get('reason'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readJsonResponse<ApiResponse>(response);
      if (!response.ok) setError(apiMessage(result, 'Agreement lifecycle update failed.'));
      else router.refresh();
    } catch {
      setError('The agreement governance service could not be reached.');
    } finally {
      setPending(false);
    }
  }

  if (status !== 'DRAFT' && status !== 'APPROVED') return null;
  return (
    <form action={update} className="admin-finance-actions__form">
      {action === 'APPROVE' ? (
        <label>
          Counsel approval reference
          <input maxLength={200} minLength={10} name="legalApprovalReference" required />
        </label>
      ) : null}
      <label>
        Required decision reason
        <textarea maxLength={500} minLength={10} name="reason" required />
      </label>
      <label>
        Type {action} {versionLabel}
        <input
          autoComplete="off"
          name="confirmation"
          placeholder={`${action} ${versionLabel}`}
          required
        />
      </label>
      <button className="ui-button ui-button--secondary" disabled={pending}>
        {pending
          ? 'Saving…'
          : action === 'APPROVE'
            ? 'Release approved agreement'
            : 'Retire agreement'}
      </button>
      {error ? (
        <span className="auth-form__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
