# Payment gateway activation

The portal now exposes idempotent hosted-checkout intent creation against a provider-neutral HTTPS contract. Amount and currency always come from an unexpired server-side hotel quote; card or bank credentials never pass through Mandyal Travels. A production release is blocked unless live gateway mode, endpoint, API key, webhook secret, trusted `PUBLIC_APP_ORIGIN`, and `PAYMENT_PROVIDER_ALLOWED_HOSTS` are configured.

`PUBLIC_APP_ORIGIN` must be the canonical HTTPS portal origin, for example `https://www.mandyaltravels.com`, with no path. It is the only origin used for hosted-checkout return URLs; incoming `Host` headers are never trusted. `PAYMENT_PROVIDER_ALLOWED_HOSTS` is a comma-separated list of contracted API and hosted-checkout domains. Keep it as narrow as possible and include every legitimate checkout or refund subdomain used by the provider.

Provider onboarding must approve the merchant entity, permitted payment methods, settlement bank account, webhook IP/signature scheme, capture/refund semantics, dispute handling, reconciliation files, data residency, PCI scope, and sandbox/production credentials. Use hosted checkout or tokenized provider elements only. Never add raw PAN, CVV, UPI PIN, or bank credentials to this repository, logs, database, or support tools.

Until a contracted gateway is configured, the current local demonstration booking path remains available only outside production. It must not be represented as a real charge. Production environment validation prevents accidental launch in demonstration mode.

## Capture, allocation, and accounting

A booking is confirmed only after a signed provider webhook marks the exact hosted-checkout intent as captured. The intent must belong to the booking quote and its integer amount and ISO currency must match the server-calculated final total. A captured intent is single-use. Production and live mode reject bookings without this evidence; the sandbox simulator remains explicitly labelled and unreconciled.

Each verified hotel capture is atomically divided into supplier payable, platform commission, and tax payable allocations. Commission uses the contracted supplier basis points and all rounding remainder stays in the supplier payable, so allocations always equal the captured amount exactly. The same transaction writes an immutable balanced journal: payment-provider clearing is debited and the supplier, commission, and tax liabilities are credited. Refund approvals create balanced reversing postings. An unbalanced journal is rejected before database storage.

This is compatible with a payment-split aggregator, but Mandyal Travels remains the source of truth for the commercial split. The provider may execute the collection and payout; it must not recalculate the commission or alter the booking total independently.

## Settlement and supplier payouts

Settlement generation includes only confirmed, checked-out hotel bookings backed by live, matched captures. It applies the supplier settlement delay and stores immutable per-booking settlement lines, preventing the same booking from being settled twice. Approved refunds reduce supplier payable, commission, and tax proportionally using integer-safe rounding; a fully refunded booking is excluded. Pending, processing, and provider-failed refunds reserve their amount so concurrent finance actions cannot over-refund a capture and hold the booking out of supplier settlement until finance review reaches a terminal state. Bus, car, and flight transactions stay outside this live settlement path until their provider capture records use the same verified payment model.

Supplier payout destinations are provider-tokenized. Mandyal Travels stores the beneficiary token, masked routing information, bank name, and final four account digits only—never a full account number or bank credential. Administrators verify a single default destination before approved settlements can enter an idempotent payout batch. A production payout provider still requires contracted credentials, beneficiary onboarding/KYC, signed callbacks, failure handling, reconciliation files, and operational certification before money is released.

The finance console shows payment environment and reconciliation state, balanced journals and postings, supplier allocations, governed payout batches, and the compatibility ledger used by older reports.

## Webhooks and refunds

Providers sign `timestamp.raw-body` with HMAC-SHA256 and send the digest in `x-payment-signature` plus the Unix timestamp in `x-payment-timestamp`. Use a random webhook secret of at least 32 characters. Payloads are size-bounded, replay-window checked, field-bounded, and idempotently recorded before intent status changes.

Refund approval atomically claims a pending or provider-failed request for processing before contacting the configured provider-neutral refund endpoint. Only a provider-completed response records an approval and reversing journal; failures remain explicitly retryable with the same idempotency key. Provider credentials and final certification remain deployment responsibilities.
