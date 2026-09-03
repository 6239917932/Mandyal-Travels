# Marketplace tax and settlement controls

This document describes the operational calculation implemented by rule version
`IN-MARKETPLACE-2026-08-31-v1`. It is a controlled system specification, not a tax return or a
substitute for professional review of Mandyal Travels' facts, registrations, contracts, or input-tax
credits.

## Commercial model

- A hotel supplier enters its own base price.
- The public taxable price is grossed up so the platform's 20% gross commission is included in that
  public price. The commission includes GST on the commission and standard payment processing.
- Accommodation GST is shown separately to the customer and is never treated as platform revenue.
- A supplier cannot select a tax rate. The server selects the configured rate from the reviewed tax
  profile and nightly public taxable value.
- A registered supplier receives its base price plus the accommodation GST, less applicable GST TCS
  and Section 194-O TDS.
- For an approved unregistered accommodation supplier classified under Section 9(5), the platform
  records the accommodation GST liability and settles the supplier base less any applicable
  Section 194-O TDS.
- Gateway fees are recorded as an internal estimate until the signed PayU schedule is configured.
  They are absorbed by the commission and are not added as an undisclosed customer surcharge.

## Immutable booking evidence

Every managed hotel booking stores the rule version, supplier classification, customer taxable
value, accommodation GST, commission before GST, commission GST, GST TCS, Section 194-O TDS,
estimated gateway cost, platform contribution, and net supplier settlement. Historical snapshots do
not change when a later rule is introduced.

These snapshots feed the administrator and supplier trackers. Dashboard values are estimates for
reconciliation: they do not include off-platform activity, final input-tax credits, adjustments, or
government-portal filing status.

## Activation sequence

The following controls remain independent and fail closed:

1. Verify the supplier's identity, GST status, state code, Section 9(5) classification, and any
   Section 194-O exemption evidence.
2. Obtain the signed versioned supplier agreement and approve the listing.
3. Confirm Mandyal Travels' GST registration and the reviewed tax treatment.
4. Configure the signed PayU commercial fee schedule and production collection credentials.
   Activate PayU Split & Transfer separately only after PayU approves the marketplace payout model.
5. Enable public partner listings through the audited platform feature control.
6. Enable live marketplace payments through its separate audited feature control.

Direct car marketplace inventory remains disabled until transport licensing and tax classification
are separately approved. No dashboard action files or pays a tax return automatically.
