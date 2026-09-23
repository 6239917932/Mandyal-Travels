# Razorpay payment and Route activation

Razorpay is the only provider for new online collections. The portal creates an idempotent Razorpay
Order from an unexpired server-owned quote, fixes the INR amount, disables partial payment, and
opens Razorpay Checkout. Mandyal Travels never receives or stores PAN, CVV, UPI PIN, or banking
credentials.

Checkout success is not trusted by itself. The server verifies Razorpay's HMAC signature using the
original order ID, fetches the payment through the authenticated API, and requires captured status,
the exact order, amount, and currency. Signed webhooks provide the primary asynchronous update and
are deduplicated by Razorpay event ID. The captured `pay_...` reference is stored separately from the
`order_...` reference so refunds and reconciliation address the correct provider object.

Production requires `PAYMENT_PROVIDER_ID=razorpay`, `PAYMENT_GATEWAY_MODE=live`,
`RAZORPAY_INTEGRATION_ENABLED=true`, a live `RAZORPAY_KEY_ID`, server-only key secret, and a strong,
independent webhook secret. Configure the webhook URL as
`https://www.mandyaltravels.com/api/v1/payments/webhooks/razorpay` for at least
`payment.captured` and `payment.failed`. Keep secrets only in Railway's secret store; never send them
by email or place them in screenshots, browser code, source control, or support tickets.

## Route split settlements

Route remains off until Razorpay approves the marketplace, linked accounts, commercial schedule,
refund/reversal behaviour, and production credentials. Enabling Route also requires a recorded
approval reference and a verified default payout destination whose provider token is a Razorpay
`acc_...` linked-account ID. Checkout fails closed when that governed destination is absent.

When enabled, the supplier share is calculated from the partner's contracted commission basis
points and attached to the Order as a transfer in paise. The transfer is created `on_hold`; it must
not be released until the booking and settlement controls permit payment. The transfer total cannot
exceed the customer order amount, and the platform remainder stays in the Razorpay nodal account.
Mandyal Travels' balanced booking ledger remains the commercial source of truth.

Route transfers, reversals, refund allocation, settlement reconciliation, disputes, and
chargebacks must pass supervised test-mode and live-mode certification before flags are enabled.
Razorpay currently charges separately for payment processing and Route transfers; confirm the
signed commercial schedule before activation.

## Historical PayU records

No new PayU checkout is selectable or configured. Legacy PayU callback and verification code is
retained only to reconcile payment records created before the migration. Historical provider IDs
must never be rewritten because that would break refunds, evidence, and audit trails.

## Refunds

Refund requests use the captured Razorpay payment ID, the original currency, and a bounded amount.
The finance workflow marks a refund completed only after Razorpay reports `processed`; accepted or
pending responses remain unresolved. Route transfer reversal and supplier-ledger adjustments must
also reconcile before a refunded booking becomes settlement-eligible.
