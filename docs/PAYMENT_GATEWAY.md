# Payment gateway activation

The portal now exposes idempotent hosted-checkout intent creation against a provider-neutral HTTPS contract. Amount and currency always come from an unexpired server-side hotel quote; card or bank credentials never pass through Mandyal Travels. A production release is blocked unless live gateway mode, endpoint, API key, and webhook secret are configured.

Provider onboarding must approve the merchant entity, permitted payment methods, settlement bank account, webhook IP/signature scheme, capture/refund semantics, dispute handling, reconciliation files, data residency, PCI scope, and sandbox/production credentials. Use hosted checkout or tokenized provider elements only. Never add raw PAN, CVV, UPI PIN, or bank credentials to this repository, logs, database, or support tools.

Until a contracted gateway is configured, the current local demonstration booking path remains available only outside production. It must not be represented as a real charge. Production environment validation prevents accidental launch in demonstration mode.

## Webhooks and refunds

Providers sign `timestamp.raw-body` with HMAC-SHA256 and send the digest in `x-payment-signature` plus the Unix timestamp in `x-payment-timestamp`. Events are idempotently recorded before intent status changes. Approved refunds can be dispatched through the separately configured refund endpoint; provider credentials and final certification remain deployment responsibilities.
