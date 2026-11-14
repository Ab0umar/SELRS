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

## Marketing generation

The Facebook scheduler starts with the server and checks again every five minutes. Full
rules, error codes, and the jobs-list buttons are in `docs/ai-workspace.md`.

- A start that fails before the job is accepted waits 5 minutes, then 30 minutes, then
  2 hours. The failure after that 2-hour wait stops the page until the next Cairo day.
  The counter is in memory. A server restart clears it and the next check can try at once.
- A Manus job that ended `failed` is retried once that Cairo day, except when the error
  starts with «انقطع بدء مهمة Manus قبل استلام رقمها». That text means the process died
  during start; a Manus task may already exist. `uncertain` jobs are not retried.
- A `starting` row with no Manus task id becomes `failed` after 10 minutes. An `uncertain`
  row with a task id is polled for 6 hours. On «مهام التوليد» (dashboard and drafts),
  «إعادة فحص المهمة الآن» polls immediately and «إيقاف المهمة» marks the job failed so the
  draft can take a new image. Abandon asks for confirmation. Both actions are admin-only
  (`marketing.resolveGenerationJob`).
- Central (Gemini/Grok) jobs have no `failed` state. They stay `uncertain` and store
  `ai_marketing_jobs.error_code`. The server log line is
  `[marketing] central draft ended uncertain` plus the error name and that code.

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

## Public clinic site

`/` is `RootRouteGate` in `client/src/routes/guards.tsx`. A signed-out browser renders
`client/src/features/public-site/LandingPage.tsx`. A signed-in staff session, a Capacitor
app, or a user agent containing `SELRSDesktop/1` or `SELRS/1` redirects to `/home`.
Appointment links on the page go to `/my/login`. Styles stay under `.selrs-landing` in
`landing.css`; tab, deep-link, and theme behavior is `setupLanding` in `landingBehavior.ts`.

`PublicSiteShell.tsx` and `siteContent.ts` in the same folder are not imported by the
route. Content rules, contacts, and open items (missing doctor photos, the operations
phone) are in `docs/prototypes/landing-handoff.md`.

## Patient login (WhatsApp OTP)

Patients sign in at `/my/login`. `patientPortal.login` sends a 6-digit code by WhatsApp,
`verifyLoginOtp` checks it, and a phone that matches more than one file continues with
`selectLoginPatient`. The procedure contract, the privacy of the login response, and
guest-booking limits are in `docs/api-reference.md` (Patient Portal Router).

### Required environment

All three must be non-empty or `patientOtpConfigured()` is false and `login` returns
`SERVICE_UNAVAILABLE`:

| Variable | Role |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Graph API bearer token |
| `WHATSAPP_PHONE_NUMBER_ID` | Sender phone number id |
| `WHATSAPP_AUTHENTICATION_TEMPLATE` | Authentication template name. Empty default, so login stays off until this is set |

`WHATSAPP_TEMPLATE_LANGUAGE` defaults to `ar`. `WHATSAPP_API_VERSION` defaults to `v25.0`.
The send in `server/services/patientOtpWhatsApp.ts` is a template message with the code as
the body parameter and again as the URL button parameter at index `0`.

### Template

`scripts/prepare-patient-login-template.ts` looks up the sender on WhatsApp business
account `2034041873405896`. With no flag it prints the template status and refuses a
template whose category is not `AUTHENTICATION`. `--apply` creates
`selrs_patient_login_otp` (or `WHATSAPP_AUTHENTICATION_TEMPLATE` when that env var is set)
with a 5-minute expiry footer and a copy-code OTP button.

```bash
pnpm exec tsx scripts/prepare-patient-login-template.ts
pnpm exec tsx scripts/prepare-patient-login-template.ts --apply
```

The script needs `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. It prints
`NOT_CREATED` when the template is missing and `--apply` was not passed.

Apply migration `drizzle/0111_patient_portal_otp_login.sql` before relying on login.
It widens `patient_portal_otps.code` to 64 characters, adds `challengeId` and
`patientId`, and marks older rows that have no `challengeId` as `verified` so a legacy
code cannot be submitted.

### When login looks successful and the code never arrives

`login` returns `{ challengeId, expiresInSeconds: 300, resendAfterSeconds: 60 }` in
each of these cases:

- No patient has that phone and birth date (or a null birth date, when the form left it blank).
- That phone already hit 3 sends in 15 minutes, or a send in the last 60 seconds.
- WhatsApp did not accept the message. The challenge is marked `verified` and the log line is `[patient-portal] OTP_DELIVERY_FAILED`.

`verifyLoginOtp` then answers `كود التحقق غير صحيح أو انتهت صلاحيته`. A birth date that
differs from the one sent to `login` fails the same way, because the stored code is an
HMAC over the challenge, patient, phone, digits, and birth date.

These calls fail immediately instead: database down, the three WhatsApp settings above
unset, more than 5 `login` calls per IP and phone in 15 minutes, or more than 20 OTP
sends per IP in 15 minutes.

Paid leave for attendance is a separate change. See `docs/ATTENDANCE_SYNC.md` (Paid leave).
It needs `drizzle/0110_attendance_paid_leave.sql` so `attendance_leaves.type` accepts `paid`.

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
