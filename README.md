# Mandyal Travels Portal

This GitHub repository is the main saved version of the Mandyal Travels portal.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the completed scope, production integration blockers,
and release checklist.

## Current portal modules

- Hotel search, room selection, booking, payment demonstration, and partner operations
- Flight search and booking journey
- Bus search, seat selection, and booking journey
- Car rental search and booking journey
- Inventory and availability controls
- Customer accounts and unified trip history
- Business workspaces with travellers, roles, policy approvals, reports, statements, audit history,
  and organization support cases
- Prisma-based data layer prepared for development

## Run the portal on Windows

1. Download or clone this repository.
2. Double-click `START-PORTAL.cmd`.
3. Keep the command window open while using the portal.
4. The portal opens at `http://localhost:3000`.

## Install future updates on Windows

1. Stop the running portal window.
2. Double-click `UPDATE-PORTAL.cmd` and leave its window open until it reports success. It creates a
   timestamped database backup in `prisma/backups` before applying schema changes.
3. Double-click `START-PORTAL.cmd` again.

The update helper never accepts a database data-loss warning automatically. If Prisma asks about
possible data loss, choose **No** and have the warning reviewed before continuing.

## Important

- Payment functions are demonstrations until a real payment gateway is connected.
- Do not commit a real `.env` file or credentials.
- Use `.env.example` only as the configuration guide.
- Before a production deployment, replace both example secrets with independent random values of at
  least 32 characters. Placeholder or short secrets are rejected in production.
- The `main` branch is the saved working baseline.

## Provision an internal operations administrator

Platform operations access is intentionally separate from customer and company administration.
Create a dedicated customer account, then run this once from the `frontend` folder:

```powershell
npm run admin:grant -- administrator@example.com --confirm
```

Sign in with that account to open the read-only operations console at `/admin`. The command refuses
to replace a business administrator role so company and platform responsibilities remain separate.

## Release checks

- Run `npm run check` before publishing a release.
- The deployment readiness endpoint is `/api/v1/health`. It returns HTTP 200 only when the portal
  can reach its database.
- Apply reviewed Prisma schema changes before starting an updated deployment, and back up the
  database before approving any command that warns about data loss.
- Production deployments should apply source-controlled migrations with `npm run db:deploy`.
