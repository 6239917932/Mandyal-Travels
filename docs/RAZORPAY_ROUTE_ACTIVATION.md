# Razorpay Route activation

## Current state

Razorpay is recorded as a future payment and split-settlement provider. It is not active. PayU
remains the configured collection provider, and no existing checkout, booking-confirmation or
accounting behavior is replaced by this preparation work.

The application deliberately rejects Razorpay checkout, webhook and refund activity until a
dedicated adapter is implemented and certified. Environment variables alone cannot bypass this
code-level gate.

## External approval evidence

Before implementation or activation, retain the following evidence in the restricted compliance
record rather than the source repository:

- Razorpay Route approval and ticket reference.
- The accepted first-operational-year declaration and any supporting documents requested by
  Razorpay.
- Confirmation of the approved business model, transaction types and settlement flow.
- The approved linked-account onboarding and KYC/KYB requirements.
- Production account identifiers, webhook configuration and permitted domains. Secrets belong only
  in the deployment secret manager.

## Customer and payee transparency

For every third-party service, show the actual provider's legal or trading identity on the listing
or service page and again during checkout or payment. The payment view must also show the service,
total amount, material cancellation terms and support route. Persist the displayed provider identity
and terms version with the booking so later audit evidence does not depend on mutable listing data.

For accommodation, the named hotel or accommodation provider directly interfaces with the customer
to complete check-in, deliver the stay and related services, and support checkout or service issues.

## Dedicated adapter requirements

Implement and test each item against the then-current official Razorpay documentation and the exact
products enabled on the account:

1. Server-created fixed-amount checkout or order with a unique idempotency context.
2. Server-side payment verification; browser success state must never confirm a booking.
3. Razorpay webhook signature verification over the unmodified bounded request body.
4. Event allow-listing, replay protection, amount and currency matching, and idempotent persistence.
5. Original-method refunds with asynchronous status tracking and reconciliation.
6. Route linked-account onboarding, activation state and destination verification.
7. Server-calculated transfer amounts based on the immutable Mandyal commercial allocation.
8. Transfer reversal and refund allocation behavior, including partial refunds and failed transfers.
9. Settlement, fee, tax and bank reconciliation with exception queues and immutable audit evidence.
10. Sandbox, negative, retry, timeout, duplicate-event and production smoke tests.

## Activation sequence

1. Receive written Route approval and confirm the permitted operating model.
2. Implement the dedicated adapter without changing PayU production settings.
3. Configure Razorpay test credentials in the secret manager and keep both Razorpay enablement flags
   false in production.
4. Complete checkout, webhook, refund, transfer, reversal and reconciliation certification.
5. Obtain finance and legal approval for settlement, tax, customer disclosure and agreement text.
6. Run a controlled low-value production transaction and reconcile the complete ledger trail.
7. Change the active provider only during an approved release window with rollback instructions.

## Rollback

Provider activation must not mutate historical provider identifiers. Existing PayU intents and
events continue to reconcile through PayU. If Razorpay activation fails, disable new Razorpay
checkout creation, preserve all received webhook evidence and complete or reverse in-flight money
movement according to provider-confirmed state before restoring the previous collection path.
