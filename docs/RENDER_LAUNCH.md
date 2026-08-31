# Render launch profile

`render.yaml` provisions the first public PMS launch candidate as one Next.js web service and one
managed PostgreSQL database in Singapore. It deliberately keeps fixture inventory, demonstration
transport checkout, payment processing, Amadeus, and Hotelbeds disabled. Supplier application
persistence and all partner mutations remain paused for the public review; live money movement must
remain unavailable until Cashfree approves the merchant account and the payment integration is
separately certified.

The initial Blueprint uses Render's free web and PostgreSQL plans solely to complete deployment and
functional acceptance. Free web services can sleep when idle, and free PostgreSQL expires after 30
days. Before advertising the portal or accepting real partner data, upgrade both resources to
persistent production plans, enable backups, and complete the production controls in
`PRODUCTION_RUNTIME_RUNBOOK.md` and `PRODUCTION_DATA_PLATFORM.md`.

## Deployment sequence

1. In Render, create a Blueprint from the GitHub repository and the `main` branch.
2. Wait for the database migration and web deployment to finish.
3. Confirm `/api/v1/health/live` and `/api/v1/health` both return HTTP 200.
4. Test registration, sign-in, contact, partner application, hotel search, and car search.
5. Add `mandyaltravels.com` and `www.mandyaltravels.com` as custom domains, then replace the GoDaddy
   DNS records with the exact values Render supplies.
6. Set `PUBLIC_APP_ORIGIN=https://mandyaltravels.com` in Render and redeploy.
7. Re-run the public runtime, accessibility, internal-link, security-header, and mobile checks.

Do not enable payment or payout environment variables merely to satisfy a readiness check. Those
features remain unavailable until the real provider credentials, webhook verification, settlement
process, and reconciliation runbook are approved.
