# Monitoring and logging runbook

The API emits correlation IDs and keeps sensitive values out of governed audit metadata. Production must ship structured application, access, security, job, payment, supplier, and notification events to an approved observability platform with environment, service, release, severity, correlation ID, and safe actor/resource identifiers.

Define dashboards and alerts for availability, latency, error rates, saturation, queue age, payment webhook failures, supplier sync failures, notification failures, authentication abuse, backup age, and business conversion. Set retention and access controls, redact credentials and personal data, connect on-call escalation, and test alert delivery before launch.
