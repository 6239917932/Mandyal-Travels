import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  AdminAgreementDraftForm,
  AdminAgreementLifecycle,
  AdminOnboardingCouponCreateForm,
  AdminOnboardingCouponStatus,
} from '@/components/admin/AdminPartnerOnboardingManager';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { isPlatformFeatureEnabled } from '@/services/platformFeatureFlagService';

export const metadata: Metadata = { title: 'Supplier enrollment operations' };

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : 'Not recorded';
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { currency, style: 'currency' }).format(value / 100);
}

export default async function AdminPartnerOnboardingPage() {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/partners/onboarding');
  const [enabled, coupons, orders, couponEvents, agreements, agreementEvents] = await Promise.all([
    isPlatformFeatureEnabled('PAID_PARTNER_ONBOARDING'),
    prisma.partnerOnboardingCoupon.findMany({
      include: { createdBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.partnerOnboardingOrder.findMany({
      include: {
        agreementAcceptance: {
          include: { agreementVersion: { select: { version: true } } },
        },
        coupon: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.partnerOnboardingCouponEvent.findMany({
      include: {
        actor: { select: { firstName: true, lastName: true } },
        coupon: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.partnerAgreementVersion.findMany({
      include: {
        _count: { select: { acceptances: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        release: { select: { key: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.partnerAgreementVersionEvent.findMany({
      include: {
        actor: { select: { firstName: true, lastName: true } },
        agreementVersion: { select: { version: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  const now = new Date();
  const usableCoupons = coupons.filter(
    (coupon) =>
      coupon.active &&
      coupon.startsAt <= now &&
      coupon.endsAt >= now &&
      (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit),
  ).length;
  const settledOrders = orders.filter((order) => ['CAPTURED', 'WAIVED'].includes(order.status));

  return (
    <section className="account-page platform-admin-page admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Controlled supplier enrollment</p>
          <h1>Enrollment operations</h1>
          <p>
            Monitor the ₹25,000 setup and ₹999 monthly enrollment offer, agreement evidence, and
            deliberately bounded launch waivers.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/partners">
              Back to suppliers
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/configuration">
              Release controls
            </Link>
          </div>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Paid onboarding</span>
          <strong>{enabled ? 'ENABLED' : 'DISABLED'}</strong>
          <span>
            {enabled ? 'Customer enrollment can proceed.' : 'No customer can enter this paid flow.'}
          </span>
        </div>
      </header>

      {!enabled ? (
        <Card className="admin-metric admin-metric--attention">
          <strong>Production enrollment remains intentionally disabled.</strong>
          <p>
            Do not enable it until PayU, legal, OTP/DLT, KYC storage, tax, and applicable transport
            approvals are recorded.
          </p>
        </Card>
      ) : null}

      <div className="partner-bookings__summary">
        <Card>
          <span>Recent orders</span>
          <strong>{orders.length}</strong>
        </Card>
        <Card>
          <span>Captured or waived</span>
          <strong>{settledOrders.length}</strong>
        </Card>
        <Card>
          <span>Completed evidence</span>
          <strong>{orders.filter((order) => order.completedAt).length}</strong>
        </Card>
        <Card>
          <span>Released agreement</span>
          <strong>{agreements.find((agreement) => agreement.release)?.version ?? 'NONE'}</strong>
        </Card>
      </div>

      <Card>
        <h2>Create an agreement draft</h2>
        <p>
          Paste only text supplied or approved for review by qualified Indian counsel. Mandyal
          Travels does not generate legal terms automatically.
        </p>
        <AdminAgreementDraftForm />
      </Card>

      <section className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Binding evidence controls</p>
          <h2>Supplier agreement versions</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Agreement</th>
                  <th>Integrity</th>
                  <th>Lifecycle</th>
                  <th>Acceptances</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((agreement) => (
                  <tr key={agreement.id}>
                    <td>
                      <strong>{agreement.version}</strong>
                      <span>{agreement.title}</span>
                      <span>
                        Created by {agreement.createdBy.firstName} {agreement.createdBy.lastName}
                      </span>
                      <details>
                        <summary>Review exact immutable text</summary>
                        <pre className="agreement-governance__content">{agreement.content}</pre>
                      </details>
                    </td>
                    <td>
                      SHA-256
                      <span>{agreement.contentHash.slice(0, 16)}…</span>
                      <span>Control version {agreement.governanceVersion}</span>
                    </td>
                    <td>
                      <strong>{agreement.status}</strong>
                      <span>{agreement.release ? 'CURRENT RELEASE' : 'Not released'}</span>
                      <span>Effective: {date(agreement.effectiveAt)}</span>
                      <span>Retired: {date(agreement.retiredAt)}</span>
                    </td>
                    <td>{agreement._count.acceptances.toLocaleString('en-IN')}</td>
                    <td>
                      <AdminAgreementLifecycle
                        agreementId={agreement.id}
                        governanceVersion={agreement.governanceVersion}
                        status={agreement.status}
                        versionLabel={agreement.version}
                      />
                    </td>
                  </tr>
                ))}
                {agreements.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No supplier agreement drafts exist.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <p className="hotel-page__eyebrow">Immutable legal-control activity</p>
        <h2>Agreement audit history</h2>
        <div className="supplier-admin__grid">
          {agreementEvents.map((event) => (
            <Card key={event.id}>
              <strong>
                {event.agreementVersion.version} · {event.action}
              </strong>
              <p>{event.reason}</p>
              <small>
                {event.legalApprovalReference
                  ? `Counsel record: ${event.legalApprovalReference} · `
                  : ''}
                Version {event.version} · {event.actor.firstName} {event.actor.lastName} ·{' '}
                {date(event.createdAt)}
              </small>
            </Card>
          ))}
          {agreementEvents.length === 0 ? (
            <Card>No agreement lifecycle decisions have been recorded.</Card>
          ) : null}
        </div>
      </section>

      <Card>
        <h2>Create a launch waiver</h2>
        <AdminOnboardingCouponCreateForm />
      </Card>

      <section className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Commercial controls</p>
          <h2>Launch waiver coupons</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Window</th>
                  <th>Use</th>
                  <th>State</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong>{coupon.code}</strong>
                      <span>{coupon.description}</span>
                      <span>
                        Version {coupon.version} · by {coupon.createdBy.firstName}{' '}
                        {coupon.createdBy.lastName}
                      </span>
                    </td>
                    <td>
                      {date(coupon.startsAt)}
                      <span>to {date(coupon.endsAt)}</span>
                    </td>
                    <td>
                      {coupon.usageCount.toLocaleString('en-IN')} /{' '}
                      {coupon.usageLimit?.toLocaleString('en-IN') ?? 'uncapped'}
                    </td>
                    <td>{coupon.active ? 'ACTIVE' : 'PAUSED'}</td>
                    <td>
                      <AdminOnboardingCouponStatus
                        active={coupon.active}
                        couponId={coupon.id}
                        version={coupon.version}
                      />
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No onboarding waiver coupons have been created.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="account-trips">
        <div className="account-trips__heading">
          <p className="hotel-page__eyebrow">Enrollment ledger</p>
          <h2>Recent onboarding orders</h2>
        </div>
        <Card className="business-report__table-card">
          <div className="business-report__table-scroll">
            <table className="business-report__table">
              <thead>
                <tr>
                  <th>Supplier account</th>
                  <th>Order</th>
                  <th>Commercials</th>
                  <th>Agreement evidence</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>
                        {order.user.firstName} {order.user.lastName}
                      </strong>
                      <span>{order.user.email}</span>
                    </td>
                    <td>
                      <strong>{order.status}</strong>
                      <span>{order.priceVersion}</span>
                    </td>
                    <td>
                      {money(order.dueNowAmount, order.currency)} due
                      <span>
                        {order.coupon?.code || order.couponCodeSnapshot
                          ? `Waiver: ${order.coupon?.code ?? order.couponCodeSnapshot}`
                          : 'No waiver'}
                      </span>
                    </td>
                    <td>
                      {order.agreementAcceptance ? (
                        <>
                          <strong>Accepted</strong>
                          <span>Version {order.agreementAcceptance.agreementVersion.version}</span>
                          <span>{date(order.agreementAcceptance.acceptedAt)}</span>
                        </>
                      ) : (
                        'Not completed'
                      )}
                    </td>
                    <td>
                      {date(order.createdAt)}
                      <span>Captured: {date(order.capturedAt)}</span>
                      <span>Completed: {date(order.completedAt)}</span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No supplier onboarding orders exist.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <p className="hotel-page__eyebrow">Immutable activity</p>
        <h2>Coupon audit history</h2>
        <div className="supplier-admin__grid">
          {couponEvents.map((event) => (
            <Card key={event.id}>
              <strong>
                {event.coupon.code} · {event.action}
              </strong>
              <p>{event.reason}</p>
              <small>
                Version {event.version} · {event.actor.firstName} {event.actor.lastName} ·{' '}
                {date(event.createdAt)}
              </small>
            </Card>
          ))}
          {couponEvents.length === 0 ? (
            <Card>No coupon state changes have been recorded.</Card>
          ) : null}
        </div>
      </section>

      <Card>
        <span>Currently usable waiver coupons</span>
        <strong>{usableCoupons.toLocaleString('en-IN')}</strong>
      </Card>
    </section>
  );
}
