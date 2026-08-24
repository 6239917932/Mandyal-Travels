# Support operator briefs

The administrator support queue displays a collapsed, deterministic brief beside each customer or
company case. It is a bounded aid for a human operator, not an AI system or decision engine.

## Inputs and privacy boundary

The brief builder receives only:

- queue kind (`CUSTOMER` or `BUSINESS`);
- allowlisted category (unknown values become `General support`);
- whether a booking reference exists, never the reference itself;
- open/closed state (unknown values require manual verification); and
- creation time, converted to a coarse age band.

It cannot receive or reproduce the case message, subject, customer name, email, organization name,
booking reference, payment details, or other personal data. The existing administrator-only page
continues to enforce platform-admin authentication before fetching cases.

## Behavior and safety

The brief provides factual context and four review prompts. It never ranks or assigns cases, infers
eligibility or settlement, recommends a support outcome, contacts a customer, changes a booking,
updates a case, or triggers a payment/refund action. Unknown categories and statuses fail closed to
generic manual-review guidance. The ordinary audited resolution controls remain separate and
human-triggered.

No external or AI provider is required. Cashfree configuration and payment flows are unchanged.
