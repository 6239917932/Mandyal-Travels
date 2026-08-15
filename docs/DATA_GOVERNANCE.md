# Data governance and retention controls

This repository implements user data export, governed privacy requests, consent evidence, bounded operational queries, session revocation, and security-event history. Privacy requests are deduplicated while open and receive a 30-day operational due date. Deletion is never executed immediately because bookings, invoices, fraud evidence, disputes, KYC, and statutory records may require preservation or anonymisation.

Production retention periods must be approved by Indian privacy counsel, the finance/tax owner, payment-provider contracts, and each transport/accommodation supplier contract before an automated purge job is enabled. Until approval, the system records requests for reviewed fulfillment and prohibits blanket deletion. The approved matrix must define purpose, legal basis, system of record, retention start, retention duration, anonymisation method, hold conditions, approver, and audit evidence.

Secrets, identity documents, payment data, raw provider payloads, and notification recipients must not enter analytics events or application logs. Database backups and exports inherit the same classification and access controls. Development fixtures must contain synthetic identities only.
