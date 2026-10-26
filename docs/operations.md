# Operations

Running, releasing, backing up and monitoring SELRS. Production is the Node server
(`dist/index.js`) running as the `SRV100` Windows service (NSSM) on port `4000`.

## Release checklist

Before deploying

- Code freeze on the release branch.
- `pnpm check`, `pnpm test`, `pnpm build` pass.
- Production `.env` ready, including `PORT` (production fails fast if it is busy).
- Previous stable git tag or branch identified for rollback.

After deploying

1. Server process is up and listening on the expected port; main URL returns 200 and the
   console has no critical errors; log in as admin/manager/accountant.
2. Smoke core features: `/dashboard`, `/patients` (search), `/accounting`,
   `/accounting/daily-revenue`, `/accounting/service-revenue`, `/accounting/receipts`,
   and open a patient file to confirm Medical is unchanged.
3. Mobile and responsive pass at 320, 360, 390, 430, 640 and 1024 px: no horizontal
   overflow, 44px targets, dialogs fit, tables fall back to cards (20 per page), RTL
   correct. Details in `design-guides.md`.
4. Android: `android/gradlew.bat assembleRelease`, install on a physical device and
   verify core flows (`mobile-notifications.md`).

Known operational risk: cache invalidation after MSSQL sync is non-blocking, so a failed
invalidation can leave stale `patientPageStates` until the next sync or an admin reset
(see `data-policy.md`).

## Database backup and restore

```powershell
pnpm db:backup                                  # keeps the latest 30 selrs_db_*.sql files
powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1 -OutFile "E:\backups\selrs_manual.sql"

powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1 -InFile "E:\backups\selrs_manual.sql" -DryRun
pnpm db:restore --InFile "E:\backups\selrs_manual.sql"
```

The scripts read `DATABASE_URL` from the environment or `.env`. A real restore needs
`ALLOW_DB_RESTORE=1` and should target a disposable database first. Take a backup before
any large import or migration. Migrations: `drizzle/*.sql` files separated by
`--> statement-breakpoint`.

## Offline local server

The system can run fully offline with a local MySQL.

1. Create the database and an application user (as MySQL `root`):

   ```sql
   CREATE DATABASE IF NOT EXISTS selrs26 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY '<choose-a-strong-password>';
   GRANT ALL PRIVILEGES ON selrs26.* TO 'appuser'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. `.env` at the repo root:

   ```
   DATABASE_URL=mysql://appuser:<password>@localhost:3306/selrs26
   JWT_SECRET=<random secret>
   HOST=0.0.0.0   # only for LAN access
   PORT=5000
   ```

3. Apply the schema and seed an admin:

   ```powershell
   pnpm db:push
   pnpm create-user admin <password> admin examinations
   ```

4. Run `.\scripts\run-offline-local.ps1`, or `pnpm build` then `pnpm start`.
5. For LAN access, allow inbound TCP on the chosen port in Windows Firewall.

## Monitoring

- Log every tRPC procedure with its duration; alert above 2 seconds.
- Log MSSQL query timing, especially reporting endpoints.
- Poll a health URL every 1 to 5 minutes from an external uptime monitor; alert on a
  spike of HTTP 5xx.
- Review PM2/service logs; check the browser console on critical pages after each deploy.

## Incident response

An incident is any outage or severe degradation: application down, a critical feature
broken (patient search, saving an examination), most requests slower than 5 to 10
seconds, or a discovered vulnerability.

1. Alert reaches the on-call developer.
2. Triage within 5 to 10 minutes: scope (all users or some), outage or degradation;
   read service logs (crash loops, DB connection errors, `EADDRINUSE`).
3. Contain: if it followed a deployment, roll back first. Otherwise check DB
   connectivity and load, then CPU and memory; a service restart is a temporary relief
   only. Send a short status update to stakeholders.
4. Investigate the root cause after service is restored, reproducing in staging.
5. Post-mortem: timeline, impact, root cause, what went well, action items (new test,
   better monitor, updated checklist).

Update this section after every major incident.
