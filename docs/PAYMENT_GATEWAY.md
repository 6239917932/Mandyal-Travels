# PayU payment gateway activation

PayU is the primary collection gateway. The portal creates an idempotent, fixed-amount PayU Payment
Link using OAuth client credentials and redirects the customer to PayU-hosted checkout. Amount and
INR currency always come from an unexpired server-side hotel quote; the customer cannot choose or
partially pay the amount, and card or bank credentials never pass through Mandyal Travels.

The PayU return handler does not trust a browser success redirect. It calls PayU's server-side
`verify_payment` command and requires the exact transaction ID, captured state, amount, and INR
currency before marking an intent captured. The booking page polls only the local bounded intent
status and cannot confirm a booking until that verification is stored.

`PUBLIC_APP_ORIGIN` must be the canonical HTTPS portal origin, for example
`https://mandyaltravels.com`, with no path. It is the only origin used for PayU return URLs; incoming
`Host` headers are never trusted. `PAYMENT_PROVIDER_ALLOWED_HOSTS` must narrowly include the PayU
OAuth, Payment Links, command, and hosted-link domains used by the selected environment.

Production configuration requires `PAYMENT_PROVIDER_ID=payu`, live mode, PayU Client ID/Secret,
MID, merchant key/salt, and the three explicit HTTPS endpoints. Keep all values in deployment
secrets. Never paste them into support email, screenshots, source control, pull requests, or browser
code.

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

## Webhooks, refunds, and payouts

Configure the PayU payment webhook as
`https://mandyaltravels.com/api/v1/payments/webhooks/payu`. PayU form callbacks must pass reverse-hash
validation using the server-only merchant salt and are then independently reconciled through
`verify_payment`. Payloads are size-bounded and idempotent evidence is retained without card data.

PayU refunds are asynchronous and are deliberately not connected to automatic approval yet. The
existing finance workflow must keep refund requests pending until initiation, status polling,
original-method completion, and reconciliation are implemented and accepted. Do not mark a refund
complete merely because PayU accepted the request.

PayU Split & Transfer is a separate product and is not activated by this collection adapter. Keep
all supplier payouts disabled until PayU approves the application, every supplier is onboarded as a
sub-account, and split/refund/reversal/reconciliation testing is complete. Cashfree remains only a
backup candidate while its merchant review is pending.
