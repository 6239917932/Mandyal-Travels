# Promotion governance

`/admin/promotions` is the platform-administrator workbench for database-backed coupon campaigns.
It provides human commercial controls without inventing contracted pricing, commission, tax, or
payment-provider rules.

## Decision record

Date: 24 August 2026

Decision: database-backed campaigns are authoritative for their coupon code. When a stored campaign
is paused, expired, scheduled, invalid, or otherwise blocked, the same code cannot fall through to a
built-in demonstration rule. This closes a commercial-control bypass while retaining baseline rules
only for codes that have no stored campaign.

Campaign activation is optimistic-version protected, requires a 10-500 character administrator
reason, and creates an append-only event. Expired campaigns and campaigns with invalid product
eligibility cannot be activated.

Usage-capped campaigns are enforced through persisted, transactionally attributed redemption
reservations. A guarded campaign counter prevents concurrent claims from exceeding the cap;
expired reservations release capacity, booking completion redeems the exact claim, and only a
provider-confirmed full refund reverses the usage. Stable claim keys make checkout retries
idempotent, while a mismatched retry fails closed.

## Workbench completeness

- Exact active, scheduled, blocked-cap, expired, and filtered totals
- Bounded code/name/description search and closed-catalogue product/state filters
- Stable 25-row pagination with a 1,000-result deep-history guard
- Safe JSON product parsing rather than presentation-time string replacement
- Recent append-only creation, activation, and pause history with administrator attribution
- Explicit empty, blocked, and activation-eligible states

## Activation checklist

Before activating a real commercial campaign, an authorized owner must approve its products,
effective window, percentage, minimum subtotal, maximum discount, legal wording, budget exposure,
support process, and rollback reason. A usage cap additionally requires an authorized budget and
support owner, monitoring for reservation or counter inconsistencies, and an operator procedure for
reviewing failed or expired claims. The portal already provides persisted attribution and
concurrency-safe enforcement; this does not replace commercial approval.

This milestone does not activate or configure Cashfree or any other payment provider.
