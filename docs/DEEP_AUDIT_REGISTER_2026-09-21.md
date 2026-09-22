# Mandyal Travels deep audit register — 21 September 2026

## Objective

Re-audit the complete Mandyal Travels platform from the first delivered feature through the current
production release. Verify behavior with evidence, repair reproducible defects, remove accidental
duplication, and preserve fail-closed controls where legal, tax, payment, supplier, privacy, or
provider approval is incomplete.

This register is the durable source of truth for the audit. It does not replace approval by qualified
Indian legal, tax, privacy, payment, employment, or travel-industry advisers.

## Audit rules

- Preserve user data and unrelated work. Never weaken authentication, authorization, audit trails,
  payment controls, tax gates, consent requirements, or provider feature flags to make a test pass.
- Treat production records as live. Use clearly labelled internal test records and never create a
  real payment, supplier fulfilment, statutory invoice, identity record, or public claim during QA.
- Support a claim only with code, automated-test, production-monitor, or controlled UI evidence.
- Verify changing legal and regulatory requirements against current primary government, regulator,
  standards-body, or contracted-provider sources. Record the source, retrieval date, applicability,
  owner, and required professional approval.
- Fix verified defects in small reviewable batches. Run proportionate regression tests after every
  batch and the complete release suite before deployment.

## Workstreams

1. Repository integrity: formatting, lint, types, build, migrations, dependency health, dead code,
   duplicate routes/components, unfinished markers, unsafe defaults, and configuration drift.
2. Security and privacy: authentication, authorization, tenant isolation, sessions, CSRF/origin
   controls, rate limits, uploads, secrets, logs, consent, retention, export, and deletion behavior.
3. Data and finance: booking state machines, idempotency, concurrency, inventory, folios, cashier,
   settlement, refunds, tax gates, append-only evidence, reconciliation, backup, and restore.
4. Product journeys: public hotel discovery and booking; traveller, partner/PMS, business/agency,
   and administrator workspaces; email and worker journeys; desktop and mobile accessibility.
5. Navigation and actions: every generated page, internal link, form, button, empty/error/loading
   state, permission boundary, and cross-workspace return path.
6. Production operations: Railway services, workers, scheduled jobs, monitoring, alert ownership,
   recovery procedures, deployment configuration, and launch gates.
7. Legal and commercial readiness: company disclosures, consumer terms, cancellation/refunds,
   privacy/cookies, GST and invoicing, payment-provider obligations, supplier contracting, hotel
   onboarding, communications consent, accessibility, and international applicability.
8. Business completeness: compare the implemented hotel marketplace and PMS journeys with actual
   operator needs. Add only low-risk, evidence-backed essentials; register external integrations or
   regulated capabilities as gated work rather than presenting them as live.

## Severity and completion standard

- **Critical:** unauthorized access, data exposure, financial corruption, unsafe production action,
  or legally misleading live behavior. Fix or disable before launch.
- **High:** broken core booking/PMS journey, tenant leak, irreversible inconsistency, or missing
  required control. Fix before customer onboarding.
- **Medium:** broken secondary action, confusing state, accessibility failure, duplicated logic, or
  weak recovery. Fix before broad release when practical.
- **Low:** polish, maintainability, or non-blocking improvement. Fix in bounded batches.

A workstream is complete only when its findings, fixes, tests, residual risks, external approvals,
and production evidence are recorded here or in a linked dated report.

## Current baseline

- The 21 September operational-date fix is deployed and production-monitored.
- Controlled PMS reservation `MT55D90995DD9C` is checked in to Room 103 with no payment recorded.
- The trial property is on operational date 2026-09-21; five rooms are housekeeping-ready.
- The static launch-readiness register currently verifies 20 unique gates with committed runbooks.
- Live payments, statutory invoicing, supplier payouts, and unapproved external channels remain
  outside controlled-trial authorization until their existing launch gates are satisfied.

## Findings ledger

### DA-001 — Sensitive account mutations lacked route-level same-origin defense in depth

- **Severity:** Medium
- **Affected operations:** profile update, notification/marketing consent update, privacy-request
  creation, and revocation of other sessions.
- **Evidence:** the four authenticated route handlers parsed or mutated account state without first
  calling the shared `isSameOriginMutation` control. The global API proxy already rejects untrusted
  cookie-authenticated mutations, so the production boundary was protected before this repair.
- **Resolution:** added a fail-closed 403 origin check before authentication-dependent state reads or
  writes and added a source-level regression test covering all four routes.
- **Verification:** the complete local release gate passed: 832 domain tests, 567 static internal
  links, 115 migrations, PostgreSQL parity for 150 models, 20 launch gates, and a 279-page build.
  GitHub audit, CodeQL, PostgreSQL, container, and verification jobs passed in PR 262.
- **Deployment:** merged to `main` as `2c6f21deb4081527ecd2d057f1abe6716a12c0e8`.
- **Residual risk:** keep the global proxy control and route guards together; authenticated browser
  smoke verification remains part of the production-deployment check.

## Current official-source compliance snapshot

Retrieved 21 September 2026. These sources inform the launch gates; they do not constitute legal or
tax advice and do not replace approval by the named professional owner.

| Area                                 | Primary source                                                                                                                                                                                                                                                                                                                       | Current product posture                                                                                                                                                   | Required owner before commercial activation                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Consumer and marketplace disclosures | [Department of Consumer Affairs — Consumer Protection](https://consumeraffairs.nic.in/hi/acts-and-rules/consumer-protection) and [CCPA marketplace seller-information advisory](https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/Advisory%20CCPA.pdf)                                                      | Supplier identity, platform role, pricing, support, cancellation, and grievance disclosures are modeled; public policies remain visibly draft                             | Indian e-commerce/consumer counsel                          |
| Personal data                        | [MeitY — Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-dataprotection-rules-2025gDOxUjMtQWa?pageTitle=Digital-Personal-Data-ProtectionRules-2025) and [Gazette rules PDF](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) | Versioned consent, withdrawal, access/correction/erasure requests, retention governance, and audit evidence exist; final notices and phased-rule mapping remain gated     | Indian privacy counsel and appointed grievance/data contact |
| Cyber incident readiness             | [CERT-In directions under section 70B](https://cert-in.org.in/Directions70B.jsp)                                                                                                                                                                                                                                                     | Security event records, operational monitoring, recovery runbooks, and restricted access exist; organizational reporting contacts and incident exercises require sign-off | Security/operations owner and Indian cyber counsel          |
| GST rates and hotel tax treatment    | [CBIC GST rates](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html), [IGST place-of-supply material](https://cbic-gst.gov.in/hindi/IGST-bill-e.html), [invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html), and [sectoral FAQs](https://cbic-gst.gov.in/hindi/sectoral-faq.html)                                | Operational folios and tax snapshots are present; statutory GST invoices, TCS/TDS treatment, and supplier settlement tax outputs remain fail-closed                       | Chartered accountant/GST adviser                            |

### DA-002 — Hotel-first launch retained transport language

- **Severity:** Medium
- **Evidence:** the live footer described a “Hotel and car partner workspace,” and a homepage trust
  point promised that stays and transport could be kept together even though car, flight, and bus
  tabs correctly say “Coming soon.”
- **Resolution:** changed the footer to “Hotel partner workspace” and limited the trust point to hotel
  searches, bookings, stay details, and support.
- **Verification:** public-copy regression and complete release checks are required before deployment.

### DA-003 — Footer displayed unverified payment-brand acceptance

- **Severity:** Medium
- **Evidence:** the live footer displayed Visa, Mastercard, American Express, RuPay, UPI, and PayPal
  marks independently of the active provider and checkout configuration.
- **Risk:** a brand mark can reasonably be read as a promise that the method is currently accepted.
- **Resolution:** replaced brand marks with a neutral provider-confirmed message; the checkout remains
  the authoritative place where available methods appear.
- **Verification:** footer regression and complete release checks are required before deployment.

### DA-004 — Legacy partner mutations relied only on the global origin boundary

- **Severity:** Medium
- **Evidence:** seventeen hotel, inventory, media, review, amendment, bus, and flight partner
  mutation routes were protected by the global API proxy but did not repeat the same-origin check
  in their route handler. Newer PMS routes already used both layers.
- **Resolution:** added a fail-closed route-level origin check before authentication or request-body
  processing in every affected handler. No authorization, provider, or launch gate was weakened.
- **Regression protection:** added a recursive source test that fails whenever any current or future
  partner POST, PATCH, PUT, or DELETE route omits `isSameOriginMutation(request)`.
- **Residual risk:** browser origin validation is defense in depth, not a substitute for partner,
  role, property, booking, and record ownership checks; those remain separate audit requirements.

### DA-005 — Hotel stay transitions accepted stale concurrent actions

- **Severity:** High
- **Evidence:** check-in, no-show, and checkout rules were evaluated before the serializable
  transaction, but the final booking update matched only the booking ID. A second reception session
  could submit an action based on the old status after another session had already changed it.
- **Risk:** duplicate audit events and repeated checkout side effects, including housekeeping state
  changes, could be recorded for one stay.
- **Resolution:** the transactional update now requires the booking to remain confirmed and retain
  its expected operational status. A stale action fails before housekeeping or audit side effects.
- **Regression protection:** added a source-order test proving the conditional update and conflict
  check occur before checkout room-state changes and audit-log creation.

### DA-006 — Overpaid folios could be treated as checkout-ready

- **Severity:** High
- **Evidence:** individual cashier payments were not bounded by the current outstanding balance,
  while checkout rejected only positive balances. A negative balance therefore represented an
  unresolved guest credit but passed the settlement check.
- **Risk:** a stay could be checked out while money remained due back to the guest, obscuring the
  refund or correction obligation.
- **Resolution:** payment posting now calculates the current bounded folio balance and rejects zero
  balance or overpayment attempts. Checkout now requires an exact zero balance and reports a
  distinct unresolved-credit error for negative balances.
- **Residual control:** intentional advances, deposits, refunds, and goodwill credits must use a
  separately governed workflow rather than an accidental cashier overpayment.

### DA-007 — Settlement mutations lacked same-origin enforcement

- **Severity:** High
- **Evidence:** the administrator settlement create and transition routes required an authenticated
  administrator but did not reject cross-origin browser mutation requests.
- **Risk:** an authenticated administrator could be exposed to a cross-site request that attempts to
  create, approve, or mark a supplier settlement as paid.
- **Resolution:** both settlement mutation routes now fail with `INVALID_ORIGIN` before
  authentication, body parsing, or any financial write when the request is not same-origin.
- **Regression protection:** route-source coverage verifies that the origin guard exists and executes
  before administrator authentication on both endpoints.

### DA-008 — Administrator mutation origin protection was incomplete

- **Severity:** Critical
- **Evidence:** recursive route inspection found 22 additional administrator endpoints that changed
  configuration, privacy cases, refunds, payouts, promotions, content, support, notifications, risk,
  integrations, search projections, partner access, or user access without a same-origin guard.
- **Risk:** an authenticated platform administrator could be induced by a hostile site to submit a
  state-changing request with significant operational, privacy, or financial effects.
- **Resolution:** every identified administrator mutation now rejects cross-origin browser requests
  before authentication, request parsing, or persistence.
- **Regression protection:** a recursive test now fails whenever any current or future administrator
  `POST`, `PATCH`, `PUT`, or `DELETE` route omits `isSameOriginMutation(request)`.

### DA-009 — Business and agent mutations lacked systematic origin enforcement

- **Severity:** High
- **Evidence:** 14 authenticated business and travel-agent mutation routes did not consistently
  enforce same-origin browser requests.
- **Risk:** a hostile site could attempt organization, invitation, member, policy, support, customer,
  or travel-request actions using an authenticated user's browser session.
- **Resolution:** every business and agent mutation route now rejects cross-origin requests before
  authentication, body parsing, or persistence.
- **Regression protection:** recursive coverage fails whenever a current or future business or agent
  mutation route omits `isSameOriginMutation(request)`.

### DA-010 — Concurrent settlement creation returned an internal error

- **Severity:** Medium
- **Evidence:** immutable settlement-line uniqueness safely prevented duplicate booking settlement,
  but a simultaneous calculation surfaced the database conflict as a generic server failure.
- **Risk:** finance operators could not distinguish a safe concurrent change from a system fault and
  might retry without reviewing the newly created settlement.
- **Resolution:** unique-write and serializable transaction conflicts now fail closed with the
  governed `SETTLEMENT_CONFLICT` response instructing the operator to refresh and recalculate.
- **Residual control:** the existing unique booking and source constraints remain the authoritative
  duplicate-payment barrier.

### DA-011 — Customer workspace lacked full browser-journey coverage

- **Severity:** Medium
- **Evidence:** administrator and partner PMS browser audits existed, but the authenticated customer
  workspace did not have equivalent route, accessibility, link, and responsive-layout coverage.
- **Risk:** account-page regressions could pass static checks while producing broken controls,
  inaccessible forms, invalid links, client errors, or mobile overflow for customers.
- **Resolution:** CI now audits all 15 seeded customer account routes on desktop and mobile, blocks
  external requests, checks headings, controls, forms and internal links, and retains JSON evidence.
- **Residual control:** production smoke monitoring and manual assistive-technology review remain
  separate launch responsibilities.

### DA-012 — Hotel amendment creation lacked abuse controls

- **Severity:** High
- **Evidence:** the customer hotel-amendment endpoint authenticated booking access but accepted
  cross-origin requests and did not bound repeated submissions.
- **Risk:** a hostile site or abusive client could generate duplicate operational review workload.
- **Resolution:** amendment creation now rejects cross-origin requests and applies a booking-scoped,
  IP-aware ten-request hourly limit before authentication, body parsing, or persistence.
- **Regression protection:** source-order coverage verifies both controls execute before request-body
  processing and requires a `Retry-After` response.

### DA-013 — Customer-critical routes logged raw caught errors

- **Severity:** High
- **Evidence:** authentication, password reset, public contact, hotel booking, cancellation, and
  account-export catch paths passed complete error objects to `console.error`.
- **Risk:** database or provider errors can contain personal data, request values, credentials,
  provider references, or internal stack details that must not enter production logs.
- **Resolution:** these customer-critical routes now emit fixed-name structured operational events
  and never serialize the caught error object, message, or stack.
- **Regression protection:** observability coverage injects a deliberately sensitive error and
  verifies that the emitted record contains only the governed event name and safe operational
  metadata.

### DA-014 — Live search-worker command drifted from the reviewed deployment file

- **Severity:** High
- **Evidence:** the committed Railway search-worker configuration correctly named
  `worker:search-projections`, while the live Railway service used the singular, nonexistent
  `worker:search-projection` command. Scheduled executions failed immediately with npm's missing
  script error even though the container image deployed successfully.
- **Resolution:** corrected the live start command, redeployed the service, and ran a controlled
  execution that completed with `status: SUCCEEDED` without changing inventory, rates, bookings,
  payments, refunds, settlements, or payouts.
- **Regression protection:** Railway worker configuration tests now prove every configured command
  maps to an existing reviewed one-shot package script. Release evidence must retain an exact
  live-to-source command comparison and one successful manual execution whenever a worker service is
  created or edited.
- **Residual control:** repository checks cannot read Railway dashboard state; release owners must
  retain the documented live comparison and terminal-run evidence as an operational control.

### DA-015 — Customer account APIs logged raw caught errors

- **Severity:** High
- **Evidence:** customer trip, saved-traveller, support, session, profile, payment, password,
  notification, MFA, document, and sign-out handlers passed complete caught exception objects to
  `console.error`.
- **Risk:** database and provider exceptions can contain personal data, request values, credentials,
  internal identifiers, or stack details that must not enter production logs.
- **Resolution:** all affected customer-account handlers now emit fixed-name structured operational
  events through the existing redacting logger without serializing the caught exception.
- **Regression protection:** recursive coverage scans every customer-account API route plus sign-out
  and fails if a caught error is passed directly to `console.error` or `console.warn`.

Additional findings will be appended with identifiers, severity, evidence, owner, resolution,
tests, deployment reference, and any remaining external dependency.
