# Monitoring and logging runbook

The portal emits correlation IDs and provides a strict structured-event contract in `lib/observability/operations.ts`. Events contain the service, environment, release, timestamp, severity, result, event name, and optional bounded identifiers/duration. Arbitrary metadata is deliberately unsupported so credentials, free-text notes, and personal data cannot accidentally enter operational logs.

Production must ship application, access, security, job, payment, supplier, and notification events to an approved observability platform. Configure `DEPLOYMENT_ENVIRONMENT` and `RELEASE_SHA` in every deployed environment.

## Required dashboards and alerts

| Signal                   |   Initial threshold | Severity |
| ------------------------ | ------------------: | -------- |
| Availability             |         below 99.9% | Critical |
| p95 latency              |      above 2,000 ms | Warning  |
| Oldest queued operation  |    above 15 minutes | Warning  |
| Dead-letter operations   |             above 0 | Critical |
| Newest verified backup   | older than 25 hours | Critical |
| Payment webhook failures |             above 0 | Critical |
| Supplier sync failures   |             above 3 | Warning  |
| Notification failures    |             above 5 | Warning  |

The same default thresholds are executable through `evaluateOperationalAlerts`. Tune them only with documented service objectives and operational ownership.

## Release verification

1. Confirm structured events include the correct environment and release.
2. Trigger a safe synthetic warning in non-production and verify ingestion, dashboard visibility, alert delivery, acknowledgement, and resolution.
3. Confirm secrets, personal data, payment instruments, session values, and free-text support notes are absent.
4. Verify retention and role-based log access.
5. Record evidence and an on-call owner before launch.

Runtime quality is independently exercised with `npm run test:runtime` against `PORTAL_BASE_URL`. This runs public-route smoke checks, an automated accessibility baseline, and a bounded health-endpoint load check. It complements, but does not replace, manual assistive-technology testing or a full production load exercise.
