import { getPartnerAccess } from '@/lib/partnerAuth';
import { hotelBookingService } from '@/services/hotelBookingService';
import type { ApiErrorResponse } from '@/types/commerce';

export async function GET(request: Request): Promise<Response> {
  const access = await getPartnerAccess(request);
  if (!access) {
    return Response.json(
      {
        error: { code: 'PARTNER_UNAUTHORIZED', message: 'Partner access is required.' },
      } satisfies ApiErrorResponse,
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get('page') ?? '1');
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 50;
  const [bookings, summary] = await Promise.all([
    hotelBookingService.listPartnerBookings({
      hotelSlugs: access.allowedHotelSlugs,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    hotelBookingService.getPartnerBookingSummary(access.allowedHotelSlugs),
  ]);

  return Response.json({
    data: bookings,
    meta: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(summary.totalCount /vó{h‘éì¶»§q«^v(--color-text-primary);
}

.business-audit-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.business-audit-pagination > span {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.business-statement-row h2,
.business-statement-row p,
.business-statement__parties p {
  margin: 0;
}

.business-statement__notice {
  margin: var(--space-6) 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: var(--space-4);
}

.business-checkout-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  border: 1px solid var(--color-brand-500);
  border-radius: var(--radius-md);
  background: var(--color-brand-100);
  padding: var(--space-4);
}

.business-checkout-notice > div {
  display: grid;
  gap: var(--space-1);
}

.business-checkout-notice span,
.business-request__guidance {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.business-request-record {
  width: min(100% - 2rem, 76rem);
}

.business-request-record__columns,
.business-request-record__details {
  display: grid;
  gap: var(--space-4);
}

.business-request-record__columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.business-request-record__details {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.business-request-record__details > div,
.business-request-record__list > div {
  display: grid;
  gap: var(--space-1);
}

.business-request-record__details span,
.business-request-record__details small,
.business-request-record__list dt {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.business-request-record__list {
  display: grid;
  gap: var(--space-4);
  margin: 0;
}

.business-request-record__list dd {
  margin: 0;
  font-weight: 700;
}

.customer-dashboard {
  display: grid;
  gap: var(--space-5);
  margin: var(--space-8) 0;
}

.customer-dashboard__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.customer-dashboard__action {
  display: grid;
  min-height: 7.5rem;
  align-content: center;
  gap: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.customer-dashboard__action:hover {
  transform: translateY(-2px);
  border-color: var(--color-brand-500);
}

.customer-dashboard__action strong {
  color: var(--color-brand-800);
  font-size: 1.0625rem;
}

.customer-dashboard__action span {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.account-page {
  width: min(100% - 2rem, 62rem);
  min-height: 70vh;
  margin: 0 auto;
  padding: var(--space-12) 0;
}

.platform-admin-page {
  width: min(100% - 2rem, 76rem);
}

.admin-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(16rem, 0.7fr);
  gap: var(--space-8);
  overflow: hidden;
  margin-bottom: var(--space-5);
  border: 1px solid rgb(111 181 229 / 28%);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 92% 12%, rgb(48 132 196 / 36%), transparent 34%),
    linear-gradient(135deg, var(--color-brand-950), var(--color-brand-800));
  color: var(--color-white);
  padding: clamp(1.5rem, 4vw, 3.5rem);
  box-shadow: var(--shadow-md);
}

.admin-hero__content,
.admin-hero__posture {
  display: grid;
  align-content: start;
  gap: var(--space-3);
}

.admin-hero__eyebrow,
.admin-hero__secure {
  margin: 0;
  color: var(--color-brand-200);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.admin-hero h1,
.admin-hero p {
  margin: 0;
}

.admin-hero h1 {
  color: var(--color-white);
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.02;
}

.admin-hero__content > p:not(.admin-hero__eyebrow) {
  max-width: 43rem;
  color: var(--color-brand-100);
  line-height: 1.65;
}

.admin-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.admin-hero__actions .ui-button--secondary {
  border-color: rgb(255 255 255 / 55%);
  background: rgb(255 255 255 / 8%);
  color: var(--color-white);
}

.admin-hero__signout {
  border: 0;
  background: transparent;
  color: var(--color-brand-100);
  padding: var(--space-3);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.admin-hero__posture {
  align-self: stretch;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 9%);
  padding: var(--space-5);
  backdrop-filter: blur(12px);
}

.admin-hero__posture strong {
  color: var(--color-white);
  font-size: 1.35rem;
  line-height: 1.3;
}

.admin-hero__posture span:not(.admin-hero__secure) {
  color: var(--color-brand-100);
  font-size: 0.875rem;
  line-height: 1.5;
}

.partner-workspace__links {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: var(--space-6);
}

.partner-workspace__links .ui-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.partner-workspace__links h2,
.partner-workspace__links p {
  margin: 0;
}

.partner-workspace__columns {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: var(--space-8);
}

.partner-workspace__columns h2 {
  margin: var(--space-2) 0 var(--space-4);
}

.partner-workspace__properties {
  display: grid;
  gap: var(--space-3);
}

.partner-workspace__properties .ui-card {
  display: grid;
  gap: var(--space-2);
}

.partner-workspace__properties span,
.partner-workspace__properties small,
.partner-workspace__audit span {
  color: var(--color-text-muted);
}

.partner-workspace__audit > div {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) 0;
}

.partner-workspace__audit > div + div {
  border-top: 1px solid var(--color-border);
}

.admin-section-nav {
  position: sticky;
  z-index: 5;
  top: 0;
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  margin-bottom: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 96%);
  padding: var(--space-2);
  box-shadow: var(--shadow-sm);
}

.admin-section-nav a {
  flex: 0 0 auto;
  border-radius: var(--radius-md);
  color: var(--color-brand-800);
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  font-weight: 700;
}

.admin-section-nav a:hover {
  background: var(--color-brand-50);
}

.admin-overview-grid,
.admin-record-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-4);
}

.admin-control-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.admin-control-grid .ui-card {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  border-top: 0.25rem solid var(--color-brand-500);
  background: linear-gradient(180deg, var(--color-white), var(--color-brand-50));
  padding: var(--space-5);
}

.admin-control-grid span {
  color: var(--color-brand-700);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.admin-control-grid strong {
  color: var(--color-brand-950);
  font-size: 1.05rem;
}

.admin-control-grid small {
  color: var(--color-text-secondary);
  line-height: 1.5;
}

#queues .partner-bookings__summary .ui-card a {
  align-self: end;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 800;
}

.admin-metric,
.admin-record-summary .ui-card {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 9.5rem;
  padding: var(--space-5);
}

.admin-metric span,
.admin-record-summary span {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.admin-metric strong,
.admin-record-summary strong {
  color: var(--color-brand-900);
  font-size: clamp(1.4rem, 3vw, 2rem);
}

.admin-metric small {
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.admin-metric--primary {
  border-color: var(--color-brand-500);
  background: linear-gradient(145deg, var(--color-brand-50), var(--color-white));
}

.admin-metric--attention {
  border-color: #f1b767;
  background: #fff8eb;
}

.admin-metric--clear {
  border-color: #9bd6b1;
  background: #effaf3;
}

.admin-directory-link {
  display: inline-block !important;
  color: var(--color-primary);
  font-weight: 800;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 0.2rem;
}

.admin-directory-link:hover {
  text-decoration-color: currentColor;
}

.admin-record-page {
  display: grid;
  gap: var(--space-8);
}

.admin-record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.admin-record-card {
  display: grid;
  align-content: start;
  gap: var(--space-4);
}

.admin-record-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.admin-record-list > div {
  display: grid;
  gap: var(--space-1);
}

.admin-record-list dt,
.admin-record-item span,
.admin-record-item small,
.admin-empty-state {
  color: var(--color-text-muted);
}

.admin-record-list dt {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.admin-record-list dd {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 700;
  line-height: 1.5;
}

.admin-record-item {
  display: grid;
  gap: var(--space-1);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.admin-record-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.admin-record-item span,
.admin-record-item small,
.admin-empty-state {
  font-size: 0.875rem;
  line-height: 1.5;
}

.admin-support-action {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.admin-support-action .ui-button {
  justify-self: start;
}

.admin-support-action__note {
  min-height: 5rem;
  resize: vertical;
}

.admin-export-form {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding: var(--space-5);
}

.platform-admin-page .admin-export-form {
  margin-top: var(--space-10);
  margin-bottom: 0;
}

.admin-export-form > div {
  display: grid;
  gap: var(--space-1);
}

.admin-export-form > div span {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.admin-export-form form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: end;
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .admin-export-form form {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .admin-hero,
  .admin-record-grid,
  .partner-workspace__links,
  .partner-workspace__columns {
    grid-template-columns: 1fr;
  }

  .admin-overview-grid,
  .admin-record-summary,
  .admin-control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .admin-overview-grid,
  .admin-record-summary,
  .admin-control-grid,
  .admin-record-list {
    grid-template-columns: 1fr;
  }

  .admin-hero__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-hero__actions .ui-button {
    width: 100%;
  }
}

.account-trips {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-10);
}

.account-trips__heading h2,
.account-trip h3,
.account-trip p,
.account-trips__empty p {
  margin: 0;
}

.account-trips__list {
  display: grid;
  gap: var(--space-4);
}

.account-trips__empty {
  display: grid;
  gap: var(--space-2);
}

.account-session {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 1fr);
  align-items: center;
  gap: var(--space-6);
}

.account-session > div,
.account-session dl,
.account-session dl > div {
  display: grid;
  gap: var(--space-1);
}

.account-session > div span,
.account-session dt,
.account-session__actions span {
  color: var(--color-text-muted);
}

.account-session dl {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.account-session dd {
  margin: 0;
  font-weight: 700;
}

.account-session__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

@media (max-width: 640px) {
  .account-session,
  .account-session dl {
    grid-template-columns: 1fr;
  }
}

.account-trip {
  display: grid;
  gap: var(--space-5);
}

.account-trip__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.account-trip__type {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.account-trip__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(22rem, 1.4fr);
  gap: var(--space-6);
}

.account-trip__body > div {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.account-trip__body p,
.account-trips__empty p {
  color: var(--color-text-muted);
}

.account-trip dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.account-trip dl > div {
  display: grid;
  align-content: start;
  gap: var(--space-1);
}

.account-trip dt {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.account-trip dd {
  margin: 0;
  font-weight: 700;
}

@media (max-width: 36rem) {
  .auth-form__row {
    grid-template-columns: 1fr;
  }

  .customer-dashboard__actions {
    grid-template-columns: 1fr;
  }

  .account-trip__body,
  .account-trip dl {
    grid-template-columns: 1fr;
  }

  .business-checkout-notice {
    align-items: stretch;
    flex-direction: column;
  }

  .business-invitation__actions,
  .business-invitation-link > div {
    grid-template-columns: 1fr;
  }

  .business-report__filters {
    grid-template-columns: 1fr;
  }

  .business-report__search {
    grid-column: auto;
  }

  .business-report__filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .business-request-record__columns,
  .business-request-record__details {
    grid-template-columns: 1fr;
  }

  .business-support__heading,
  .business-support__meta {
    align-items: stretch;
    flex-direction: column;
  }

  .business-support__heading > div:last-child {
    justify-items: start;
  }

  .business-audit__list li,
  .business-policy-history__heading,
  .business-policy-history li,
  .business-statement-row,
  .business-statement__parties {
    align-items: stretch;
    flex-direction: column;
  }

  .business-audit__list li > div:last-child,
  .business-policy-history li > div:last-child,
  .business-statement-row > div:last-child {
    justify-items: start;
    text-align: left;
  }
}
