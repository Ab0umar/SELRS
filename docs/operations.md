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

## Marketing publish integrity

Checked against `server/services/marketing/publish.service.ts`, `facebookPublisher.service.ts`, `scheduler.service.ts`, `manusGeneration.service.ts`, and `server/routers/marketing.ts` on 2026-11-14. Procedure shapes are in `docs/api-reference.md` (Marketing publish).

`publishMarketingPost` sets `marketing_posts.status` to `publishing` and writes a `publish_claim` log before the Graph call. A definite Facebook rejection returns the post to `draft` and releases its topic. A timeout, HTTP 5xx, HTTP 408, or a success body with no post id leaves the post in `publishing`. Another publish then throws `المنشور قيد النشر أو يحتاج مراجعة نتيجة النشر على Facebook`. `marketing.deletePost` refuses that status.

### Stuck post on the dashboard

**تحقق من Facebook** is rendered only for `status === "publishing"` inside **آخر المنشورات** on `/ai/marketing` (`MarketingDashboard`). That list is `dashboardSummary.recentPosts`: the five newest posts for the page selected in **الصفحة** (`center` = المركز, `doctor` = العيادة), ordered by `createdAt`. The drafts page has no button. A stuck post that is not in those five rows has no button; call `marketing.reconcilePublishingPost` with its id.

The button calls `reconcilePublishingPost`. A match toasts `وجدنا المنشور على Facebook وسجلناه كمنشور`. Anything else opens **حدد نتيجة النشر**:

| Button | Procedure | Result |
|---|---|---|
| نُشر على الصفحة | `resolvePublishingPost` `{ outcome: "published" }` | `published`, `publishedAt` is now, `fbPostId` stays null, topic rows in state `publishing` become `published` |
| لم يُنشر، أعده إلى المسودات | `resolvePublishingPost` `{ outcome: "not_published" }` | `draft`, those topic rows are deleted |

Both write `marketing_logs.action = publish_reconcile` and include the user id in the message. Choose **نُشر على الصفحة** only after the live post is visible. That path stores no Facebook id.

### What reconcile compares

1. The post must already be `publishing`. Otherwise: `المنشور ليس في حالة قيد النشر`.
2. The search window starts at the latest `publish_claim` log for that post, or `updatedAt` when the log is missing, minus 2 minutes.
3. The page id and token come from `marketing_facebook_pages` for the post's `pageRole`. Only `center` falls back to `marketing_settings.fbPageId` and `fbAccessToken`. No token returns unmatched with `الصفحة غير مربوطة؛ حدد النتيجة يدويًا`.
4. The call is `GET /{page-id}/posts?fields=id,message,created_time&since=<unix seconds>&limit=50`. There is no second page. A token that cannot read posts returns unmatched; the Graph error text is `لا يسمح رمز الصفحة بقراءة منشوراتها؛ حدد النتيجة يدويًا`.
5. A match is a returned post whose `created_time` is inside the window and whose message, after collapsing whitespace, starts with `buildMessage`: `content`, or `title` when content is empty, then `cta`, then `hashtags`. `prepareMarketingPublication` appends the contact footer after that string and does not store the result, so the footer may follow the prefix. An empty body never matches.
6. On a match the post becomes `published`, `fbPostId` is the Graph id, `publishedAt` is now, and `marketing_topic_publications` rows for that post still in state `publishing` become `published`.

If the status changes before the settle transaction commits, the error is `تغيرت حالة المنشور؛ حدّث الصفحة`.

### Delete

`marketing.deletePost` (admin):

- `publishing`: refused, `المنشور قيد النشر؛ حدد نتيجة النشر أولًا ثم احذفه إن لزم`.
- `draft`, same transaction: delete `marketing_topic_publications` rows for that post that are still `publishing`, and set `marketing_generation_jobs` in `starting`, `running`, or `uncertain` to `failed` with error `حُذفت المسودة`.
- `ai_marketing_jobs` is not updated. Its states are `running`, `completed`, and `uncertain`.
- The `delete_post` log is inserted after the row is gone, with `postId` null. The message contains the deleted id and the user id.

### Scheduler day and last skip

`runScheduledPost` counts "today" from midnight in `Africa/Cairo` (`cairoDayStart`), not the machine's local midnight. In the helper test, `2026-11-14T23:30:00Z` is already 15 November in Cairo (UTC+2), so the day starts at `2026-11-14T22:00:00.000Z`.

A non-`failed` post with the same `postDay` and `pageRole` and `createdAt` at or after that instant skips generation. The reason is stored with `getSystemSetting` / `updateSystemSettings` under `marketing_scheduler_skip_<pageRole>` as JSON `{ reason, at }`. `getSchedulerStatus` returns it as `lastSkip`, and the scheduler card prints **آخر تخطٍّ**. A disabled day skips without writing that setting. If the setting write throws, the log line is `[marketing-scheduler] Could not record skip reason` and the run still skips.

### Graph API version

`MARKETING_GRAPH_VERSION` (see `.env.example`) is read only in `facebookPublisher.service.ts`, for photo/feed publish and the reconcile list. It must match `v<digits>.<digits>`, for example `v22.0`. Empty, `22.0`, or any other string uses `v21.0`. Facebook OAuth in `facebookOAuth.service.ts` stays on `v21.0`. The contact lookup in `pageBranding.ts` stays on `v25.0`.

### Manus text when a device photo exists

A new Manus post (no `postId`) whose topic resolves to an assigned equipment photo asks Manus for `post.json` only. `finishJob` then brands that photo and writes no generated image file. Topics with an equipment kind in `server/services/marketing/medicalVisuals.ts`:

| Topic | Kind |
|---|---|
| البنتاكام | `pentacam` |
| الفحص قبل الليزك | `pentacam` |
| الفحص الدوري للعيون | `slit-lamp` |

`readEquipmentPhoto` returns a file only when that page role has a reference assigned for the kind. An image job on an existing draft still requires a Manus image. If the assignment is gone when the job finishes, the error is `صورة الجهاز لم تعد متاحة ولم ترجع Manus صورة`.

### Create and update limits

`createPost` and `updatePost` accept `platform: "facebook"` only, and `status: "draft"` only. `scheduledAt` can be stored on a draft; it does not publish. `instagram`, `both`, and `status: "scheduled"` fail input validation.

Tests: `server/tests/marketingPublishReconcile.test.ts`, `marketingDeletePost.test.ts`, `marketingPublishHelpers.test.ts`, and the device-photo case in `manusGeneration.test.ts`.

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
