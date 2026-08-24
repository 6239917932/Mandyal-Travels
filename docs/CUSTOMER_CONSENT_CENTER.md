# Customer consent evidence center

## Scope

`/account/consents` is a strictly read-only view of consent evidence already recorded for the
authenticated customer. It does not grant, withdraw, infer, or change consent or communication
preferences.

The first supported purpose is marketing communications. The route is intentionally conservative:
unknown database purpose, source, and status values receive generic customer-safe labels rather than
exposing internal values.

## Privacy and query boundaries

- Authentication is required and every query is scoped by the signed-in user's exact `user.id`.
- No email address or request-supplied identity is used to select records.
- The list projects only purpose, policy version, status, source, and recorded/withdrawn timestamps.
  Database record IDs and user IDs are not selected or rendered.
- Results are capped at 500, displayed 20 per page, and ordered deterministically.
- Filters accept only all, granted, or withdrawn. Invalid values fall back to all and page numbers
  are bounded.
- An absent record is displayed as absent evidence; the portal never infers permission or
  withdrawal from absence.

## Legal and operational posture

Policy versions marked as pending legal approval are described as draft and pending approval. This
history is account evidence, not legal advice and not a statement that the privacy notice has been
approved. Legal counsel must still complete the decisions listed in
`docs/PRIVACY_CONSENT_LEGAL_APPROVAL.md`.

Consent and messaging preference mutations remain owned by the existing authenticated preferences
workflow. Account navigation and privacy-export integration are deliberately deferred until the
customer-readiness and saved-traveler branches have merged, avoiding edits to their shared files.

Cashfree, payment behavior, providers, schema, migrations, shared CSS, and customer balances are not
modified by this feature.

## Verification

Run the focused regression and then the full production gate:

```powershell
node --experimental-strip-types --test tests/customer-consent-center.test.mts
npm run check
```
