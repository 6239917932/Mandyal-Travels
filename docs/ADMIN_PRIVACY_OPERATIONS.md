# Administrator privacy operations

Customers can submit access, correction, deletion, and processing-restriction requests from their
account. Every request receives a 30-day review target and appears in the protected
`/admin/privacy` queue. Customers can see the current status, target date, and latest operations
note without receiving another customer's information.

Only a separately provisioned platform administrator can start review, mark a request fulfilled,
reject it with a reason, or reopen it. Every action requires a note between 10 and 500 characters,
uses an optimistic version to prevent stale updates, and appends an immutable event containing the
actor, prior state, resulting state, note, version, and time. These events also appear in the
administrator audit workbench under the closed `PRIVACY` domain.

The workflow never automatically deletes or changes customer data. A completion records that a
human reviewer fulfilled the request through the approved operational process. Booking, invoice,
fraud, dispute, KYC, supplier, tax, and statutory retention obligations still require review before
anonymisation or deletion. Cashfree and payment records are not modified by this workflow.
