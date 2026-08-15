# Payment gateway activation

The portal now exposes idempotent hosted-checkout intent creation against a provider-neutral HTTPS contract. Amount and currency always come from an unexpired server-side hotel quote; card or bank credentials never pass through Mandyal Travels. A production release is blocked unless live gateway mode, endpoint, API key, webhook secret, trusted `PUBLIC_APP_ORIGIN`, and `PAYMENT_PROVIDER_ALLOWED_HOSTS` are configured.

`PUBLIC_APP_ORIGIN` must be the canonical HTTPS portal origin, for example `https://www.mandyaltravels.com`, with no path. It is the only origin used for hosted-checkout return URLs; incoming `Host` headers are never trusted. `PAYMENT_PROVIDER_ALLOWED_HOSTS` is a comma-separated list of contracted API and hosted-checkout domains. Keep it as narrow as possible and include every legitimate checkout or refund subdomain used by the provider.

Provider onboarding must approve the merchant entity, permitted payment methods, settlement bank account, webhook IP/signature scheme, capture/refund semantics, dispute handling, reconciliation files, data residency, PCI scope, and sandbox/production credentials. Use hosted checkout or tokenized provider elements only. Never add raw PAN, CVV, UPI PIN, or bank credentials to this repository, logs, database, or support tools.

Until a contracted gateway is configured, the current local demonstration booking path remains available only outside production. It must not be represented as a real charge. Production environment validation prevents accidental launch in demonstration mode.

## Webhooks and refunds

Providers sign `timestamp.raw-body` with HMAC-SHA256 and send the digest in `x-payment-signature` plus the Unix timestamp in `x-payment-timestamp`. Use a random webhook secret of at least 32 characters. Payloads are size-bounded, replay-window checked, field-bounded, and idempotently recorded before intent status changes. Approved refunds can be dispatched through the separately configured refund endpoint; provider credentials and final certification remain deployment responsibilities.
