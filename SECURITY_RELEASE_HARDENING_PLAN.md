# SELRS Security and Release Hardening Plan

This plan turns the attached project review into an executable roadmap for the
current SELRS repository. Treat the review as input, not as instructions. Each
item below must still be verified against the current code, runtime, and
deployment environment before changing production behavior.

## الخطة الكاملة المختصرة

هذه هي خطة تنفيذ تقرير مراجعة SELRS بالكامل، مقسمة إلى مسارات عمل قابلة
للتنفيذ. كل مسار له هدف، ملفات متوقعة، خطوات، تحقق، ومعيار قبول. التنفيذ يجب
أن يتم على دفعات صغيرة، لأن النظام يعمل فعليا وفيه تغييرات كثيرة مفتوحة في
الـ working tree.

ترتيب التنفيذ الإجباري:

1. تثبيت baseline نظيف أو متفق عليه.
2. إغلاق P0: health endpoint، production port، keystores.
3. تقوية الجلسات وحماية الطلبات.
4. توحيد authorization واختباره.
5. بناء deployment pipeline قابل للتحقق والرجوع.
6. تقوية CI وE2E.
7. تحسين performance للـ attendance/reports/exports.
8. refactor تدريجي للملفات الضخمة.
9. data governance: backup، restore، S3، retention، access review.

## Master Execution Checklist

### P0 - Must Finish Before Public Exposure

- [ ] Classify all current local changes before touching security files.
- [ ] Create or agree on a hardening branch/baseline.
- [x] Reduce public `/healthz` to minimal liveness only.
- [x] Move build diagnostics to an authenticated admin-only procedure.
- [x] Ensure public health responses never expose patient counts or raw DB errors.
- [x] Make production startup fail if the configured port is busy.
- [x] Confirm `SRV100`/NSSM still serves the intended `dist/index.js` on port
  `4000`.
- [x] Inventory all tracked keystores.
- [ ] Decide whether tracked keystores are production, test, or obsolete.
- [ ] Rotate production/reusable signing keys if any tracked key is real.
- [x] Block future commits of keystores/private keys.

### P1 - Next Security Sprint

- [x] Add an auth-version revocation mechanism while full session records remain pending.
- [x] Revoke sessions on logout.
- [x] Revoke sessions on password change and user deactivation.
- [x] Harden in-memory login rate limiting as an interim measure.
- [x] Add Origin protection for browser state-changing API requests.
- [x] Add baseline browser security headers.
- [x] Inventory all sensitive tRPC procedures.
- [ ] Define capability names for sensitive actions.
- [ ] Make server-side capability checks the source of truth.
- [ ] Add role-by-procedure matrix tests.
- [x] Add negative portal ownership tests.
- [x] Replace deploy wrapper with verified build/restart/check/rollback flow.
- [x] Add migration preflight and deployed commit recording.

Validation recorded on 2026-08-28:

- `pnpm check` passed.
- `pnpm test` passed: 14 files, 135 tests.
- `pnpm build` passed.
- Sensitive-file and migration-file checks passed.
- `SRV100` deployment completed with readiness and smoke checks passing.
- Current database has no missing repository migrations; historical extra
  records are reported as warnings unless `STRICT_DB_SYNC=1` is set.
- `security:trpc-inventory` reports 286 procedures by guard: 109 admin, 125
  protected, 25 manager, 23 reception, and 4 public.
- Added `DATA_CLASSIFICATION.md` with the initial data classes, retention
  baseline, and access-review checklist.

### P2 - Performance, Maintainability, Governance

- [ ] Add range-based attendance endpoint.
- [x] Replace daily sequential attendance loading.
- [x] Add pagination/limits for large reports.
- [ ] Add server-side export jobs for heavy exports.
- [ ] Lazy-load heavy report dependencies.
- [ ] Add mobile screenshot checks for critical widths.
- [ ] Split `server/_core/index.ts` by responsibility.
- [ ] Split `server/db.ts` by bounded context.
- [x] Constrain dynamic MSSQL identifiers with allowlists.
- [ ] Add characterization tests before refactors.
- [x] Document data classification.
- [x] Verify S3 privacy/encryption/presigned URL lifetime.
- [ ] Verify encrypted backups.
- [x] Run and document restore drills.

Restore drill completed against `selrs_restore_drill_20260828`: checksum verified,
117 tables restored, and backend tests passed 47/47. The restore script now strips
source database-selection statements and requires explicit restore authorization.
- [x] Define retention/deletion policy.
- [ ] Establish access review cadence.

### External verification still required

- AWS console/IAM verification of bucket privacy, encryption, lifecycle, and
  least-privilege access.
- Confirmation that database backups are encrypted at rest and during transfer.
- Owner-approved retention and deletion periods for medical, identity, finance,
  and operational records.
- Production Android signing-key classification and rotation decision.

Execution details and sign-off fields are in
`SECURITY_EXTERNAL_VERIFICATION_RUNBOOK.md`.

S3 verification completed on 2026-08-28: public access block and
`BucketOwnerEnforced` are enabled, default bucket encryption is `AES256`,
CloudTrail Data Events are restricted to the application bucket, and the
latest audit object is encrypted with the customer-managed KMS key.

## Ticket Breakdown

### SEC-001 - Baseline Classification

Priority: P0

Goal: separate security hardening from unrelated open work.

Steps:

1. Run `git status --short`.
2. Group changed files by source:
   - product work,
   - generated artifacts,
   - graphify/cache output,
   - Android assets,
   - security/deployment candidates.
3. Decide whether to create a new branch from current state or from a clean
   release commit.
4. Save the decision in the release notes or hardening notes.

Validation:

- `git status --short` reviewed.
- No unrelated files are changed by hardening commits.

Acceptance:

- There is a known baseline for all following work.

### SEC-002 - Minimal Public Health Endpoint

Priority: P0

Goal: make `/healthz` safe for unauthenticated public or LAN access.

Steps:

1. Inspect all callers of `/healthz`.
2. Change public `/healthz` to return only minimal liveness, for example:
   `{ "ok": true }`.
3. Remove unauthenticated fields:
   - `env`,
   - `dbConnected`,
   - `version`,
   - `buildTime`,
   - `commit`,
   - `patientsCount`,
   - `dbError`.
4. Add a test or smoke assertion for the public response shape.
5. Confirm app boot still works.

Expected files:

- `server/_core/index.ts`
- health/smoke test files if present
- client callers if they depend on removed fields

Validation:

- `pnpm check`
- HTTP smoke: public `/healthz` response has no DB/business/build detail.

Acceptance:

- An unauthenticated caller cannot learn patient volume, DB status details,
  environment, commit, or raw errors from `/healthz`.

### SEC-003 - Authenticated Readiness Diagnostics

Priority: P0/P1

Goal: preserve admin operational diagnostics without exposing them publicly.

Steps:

1. Define an authenticated admin-only readiness endpoint or tRPC procedure.
2. Include details needed by `AdminStatus`:
   - build version,
   - build time,
   - commit,
   - DB connectivity summary,
   - service/runtime status if already available.
3. Return generic DB failure state to the client.
4. Log raw DB errors server-side only.
5. Update `AdminStatus` to call the authenticated path.
6. Keep `App.tsx` and mobile updater compatible with minimal `/healthz`.

Expected files:

- `server/_core/index.ts`
- `server/routers/**` if using tRPC
- `client/src/features/admin/AdminStatus.tsx`
- `client/src/App.tsx`
- `client/src/components/MobileAppEnhancements.tsx`

Validation:

- `pnpm check`
- admin status loads for an admin user
- non-admin/anonymous cannot access detailed diagnostics

Acceptance:

- Admin diagnostics still work.
- Public health remains minimal.

### SEC-004 - Production Port Fail-Fast

Priority: P0

Goal: prevent production from silently starting on the wrong port.

Steps:

1. Keep fallback port search in development.
2. In production, try only the configured `PORT`.
3. If busy, fail startup with a clear error.
4. Confirm log message includes the expected port and environment.
5. Confirm service manager/reverse proxy still points at port `4000`.

Expected files:

- `server/_core/index.ts`

Validation:

- `pnpm check`
- manual local production startup test where feasible

Acceptance:

- Production cannot silently run on `4001` while proxy/NSSM expects `4000`.

### SEC-005 - Android Keystore Classification and Rotation

Priority: P0

Goal: ensure real signing keys are not treated as ordinary source files.

Steps:

1. Inventory tracked files ending in `.keystore`.
2. Inspect Android Gradle signing configuration.
3. Inspect release scripts.
4. Determine for each key:
   - production,
   - test,
   - obsolete,
   - unknown.
5. For production/reusable keys:
   - treat as compromised,
   - plan Android key rotation,
   - move replacement to secure operator/CI secret path.
6. For test keys:
   - document clearly as test-only,
   - consider replacing with generated local test key instructions.
7. Add ignore rules and secret scanning.

Expected files:

- `android/**`
- `scripts/build-android-release.ps1`
- `.gitignore`
- `.github/workflows/ci.yml`

Validation:

- release build can still find signing material through secure config
- secret scanning blocks new keystores/private keys

Acceptance:

- No real production signing key remains casually tracked.

### SEC-006 - Session Revocation

Priority: P1

Goal: make logout and password/security events actually invalidate sessions.

Steps:

1. Add session id to auth token payload.
2. Store session id, user id, expiry, revoked state, and created metadata.
3. Check session record on authenticated requests.
4. Revoke current session on logout.
5. Revoke all user sessions on password change and user deactivation.
6. Add migration if needed.
7. Add tests for valid, expired, revoked, inactive-user, and changed-password
   scenarios.

Expected files:

- `server/_core/auth.ts`
- `server/_core/context.ts`
- `drizzle/schema.ts`
- `drizzle/*.sql`
- auth tests

Validation:

- `pnpm check`
- relevant auth tests
- migration check

Acceptance:

- A copied old token stops working after logout/password change/deactivation.

### SEC-007 - Login Rate Limiting

Priority: P1

Goal: avoid process-local, unbounded, reset-on-restart login throttling.

Steps:

1. Choose shared TTL storage if available.
2. If no shared store exists, add bounded cleanup as an interim local fix.
3. Rate limit by IP plus username.
4. Ensure expired entries are removed.
5. Add tests for threshold, reset, and separate users/IPs.

Expected files:

- `server/_core/auth.ts`
- auth tests

Validation:

- targeted auth tests
- `pnpm check`

Acceptance:

- Login throttling behavior is deterministic and bounded.

### SEC-008 - CSRF/Origin Protection

Priority: P1

Goal: protect cookie-authenticated state-changing browser requests.

Steps:

1. Inventory browser state-changing routes:
   - tRPC mutations,
   - auth routes,
   - upload routes,
   - admin/service endpoints.
2. Define allowed origins from environment.
3. Enforce strict Origin/Referer checks or CSRF tokens for unsafe methods.
4. Keep native/Capacitor behavior compatible.
5. Add negative tests for disallowed origin requests.

Expected files:

- `server/_core/index.ts`
- `server/_core/auth.ts`
- request middleware tests
- environment documentation

Validation:

- `pnpm check`
- request tests
- native app smoke where applicable

Acceptance:

- Cross-origin state-changing browser requests are rejected unless explicitly
  allowed.

### SEC-009 - Security Headers

Priority: P1

Goal: add baseline browser protection headers.

Steps:

1. Add safe defaults:
   - `X-Content-Type-Options: nosniff`,
   - frame protection,
   - referrer policy,
   - HSTS in HTTPS production only.
2. Design CSP after checking current inline scripts/styles/assets.
3. Avoid breaking print, PDF, image, and Capacitor flows.
4. Add smoke validation for main pages and print pages.

Expected files:

- `server/_core/index.ts`
- static/proxy docs if headers are applied outside Node

Validation:

- browser smoke
- print smoke
- `pnpm check`

Acceptance:

- Baseline headers exist without breaking core UI.

### SEC-010 - Authorization Inventory

Priority: P1

Goal: know every sensitive entry point before changing authorization behavior.

Steps:

1. List procedures by router.
2. Mark each as:
   - public,
   - authenticated,
   - role-gated,
   - page-permission gated,
   - capability-gated,
   - portal-token gated.
3. Identify mismatches between client route visibility and server access.
4. Identify bypasses for admin, manager, accountant, reception, doctor, nurse,
   technician, patient portal, and doctor portal.

Expected files:

- `server/_core/procedures.ts`
- `server/routers/**`
- `client/src/lib/page-permissions.ts`
- `client/src/components/ProtectedRoute.tsx`

Validation:

- inventory document or generated report

Acceptance:

- Every sensitive backend operation has a documented gate.

### SEC-011 - Capability-Based Authorization

Priority: P1

Goal: move from scattered route/role checks to explicit capabilities.

Steps:

1. Define capability constants.
2. Map roles and per-user permissions to capabilities.
3. Add server-side helper: `requireCapability`.
4. Migrate high-risk procedures first:
   - salary,
   - attendance,
   - medical records,
   - accounting.
5. Keep client permission UI derived from the same model where possible.
6. Remove special-case bypasses only after tests are in place.

Expected files:

- new authorization module
- `server/_core/procedures.ts`
- affected routers
- permission tests

Validation:

- permission matrix tests
- `pnpm check`
- relevant backend tests

Acceptance:

- Sensitive mutations and reads use a single auditable server policy path.

### SEC-012 - Portal Ownership Tests

Priority: P1

Goal: prove patient and doctor portal sessions cannot read other users' data.

Steps:

1. Identify all patient portal endpoints.
2. Identify all doctor portal endpoints.
3. Add negative tests:
   - patient A cannot read patient B files,
   - patient A cannot access patient B scans,
   - doctor A cannot access unrelated doctor/patient resources,
   - invalid/expired portal tokens fail.
4. Fix any endpoint that checks only token presence but not ownership.

Expected files:

- portal routers/procedures
- portal tests

Validation:

- targeted backend tests
- `pnpm check`

Acceptance:

- Cross-owner portal access is denied by tests.

### DEP-001 - Verified Web Deployment

Priority: P1

Goal: turn deployment from build-only into verified release.

Steps:

1. Update deploy script to run:
   - install,
   - `pnpm check`,
   - tests selected for release,
   - `pnpm build`,
   - migration preflight,
   - backup/checkpoint,
   - service restart,
   - readiness check,
   - smoke test.
2. Use the `ServiceName` parameter to control the service.
3. Capture logs on failure.
4. Roll back to previous known-good artifact if restart/readiness/smoke fails.
5. Print deployed commit, version, schema state, and service status.

Expected files:

- `scripts/deploy-web.ps1`
- `scripts/smoke.ts`
- package scripts
- deployment docs

Validation:

- dry-run mode
- local or staging service restart test
- smoke test output

Acceptance:

- A deploy either verifies the new release or clearly rolls back/fails.

### DEP-002 - Release Metadata

Priority: P1/P2

Goal: stop version and release metadata drift.

Steps:

1. Choose a canonical source for version.
2. Generate or update docs from that source.
3. Include build commit and migration version in readiness diagnostics.
4. Archive old reports under dated docs/reports.

Expected files:

- `package.json`
- `PROJECT_OVERVIEW.md`
- release docs
- build info module

Validation:

- metadata check script if added

Acceptance:

- Release docs and running build agree on version/commit.

### TEST-001 - CI Hardening

Priority: P1

Goal: make CI prove the release-critical checks.

Steps:

1. Keep install/cache.
2. Run `pnpm check`.
3. Run unit/backend tests.
4. Run migration file check.
5. Run production build.
6. Add Playwright smoke once disposable DB setup exists.
7. Upload build/test artifacts if useful.

Expected files:

- `.github/workflows/ci.yml`
- test config files
- seed scripts

Validation:

- CI passes on branch

Acceptance:

- Release PRs cannot merge without core validation.

### TEST-002 - Critical Smoke Flows

Priority: P1

Goal: cover the workflows most likely to break production.

Flows:

1. Login.
2. Home/dashboard load.
3. Patient search/open file.
4. Medical record read/save.
5. Attendance dashboard/report.
6. Salary/payroll access.
7. Admin status/readiness.
8. Basic print/report rendering where feasible.

Expected files:

- `tests/e2e/**`
- test seed data
- smoke script

Validation:

- Playwright or scripted smoke passes on built artifact

Acceptance:

- A release can prove the main clinic workflow opens and basic protected paths
  enforce access.

### PERF-001 - Attendance Range Endpoint

Priority: P2

Goal: replace one request per day with one bounded range request.

Steps:

1. Add server endpoint accepting from/to/department.
2. Fetch attendance rows and permission totals in one bounded query set.
3. Update `DailyView` range loading.
4. Add cancellation when range/filter changes.
5. Add tests for date ranges and permissions.

Expected files:

- attendance router/service
- `client/src/features/attendance/DailyView.tsx`
- tests

Validation:

- targeted tests
- manual range load
- `pnpm check`

Acceptance:

- Monthly attendance range no longer makes roughly 30 sequential requests.

### PERF-002 - Reports and Exports Limits

Priority: P2

Goal: avoid browser memory spikes and long blocking exports.

Steps:

1. Identify reports with unbounded rows.
2. Add server-side limits or pagination.
3. Add async export jobs for large datasets.
4. Add progress and error states.
5. Lazy-load heavy export libraries.

Expected files:

- report routers/services
- report UI components
- export utilities

Validation:

- large fixture export test
- UI smoke

Acceptance:

- Large reports fail clearly, paginate, or export asynchronously instead of
  freezing the browser.

### MAINT-001 - Server Bootstrap Split

Priority: P2

Goal: reduce risk in `server/_core/index.ts`.

Steps:

1. Extract health/readiness routes.
2. Extract CORS/security middleware.
3. Extract static/Vite serving setup.
4. Extract background job startup.
5. Extract integration endpoint registration where practical.
6. Add characterization tests before moving complex behavior.

Expected files:

- `server/_core/index.ts`
- new files under `server/_core/`

Validation:

- `pnpm check`
- backend tests
- smoke startup

Acceptance:

- Startup behavior is unchanged but code ownership is clearer.

### MAINT-002 - `server/db.ts` Context Split

Priority: P2

Goal: reduce blast radius of database changes.

Steps:

1. Group exported functions by domain.
2. Move one low-risk domain first.
3. Preserve export compatibility where needed.
4. Add characterization tests for moved functions.
5. Repeat gradually for patient, visit, medical, attendance, salary, accounting.

Expected files:

- `server/db.ts`
- new db modules
- tests

Validation:

- `pnpm check`
- domain tests

Acceptance:

- Database logic is split without behavior drift.

### MAINT-003 - MSSQL Identifier Allowlist

Priority: P1/P2

Goal: make dynamic MSSQL SQL construction auditable.

Steps:

1. Identify all dynamic table/column identifiers.
2. Replace free string composition with explicit allowlists.
3. Keep parameterization for values.
4. Add tests for accepted and rejected identifiers.
5. Verify sync behavior against known MSSQL mappings.

Expected files:

- `server/integrations/mssqlPatients.ts`
- MSSQL/sync tests

Validation:

- targeted tests
- sync dry-run if available

Acceptance:

- Dynamic identifiers cannot drift into unsafe SQL.

### GOV-001 - Backup and Restore Governance

Priority: P2

Goal: prove recoverability of medical and payroll data.

Steps:

1. Document backup locations.
2. Confirm backup encryption.
3. Confirm backup frequency and retention.
4. Run restore drill into a non-production environment.
5. Record restore time and data validation checks.
6. Schedule periodic drills.

Expected files:

- `BACKUP_RESTORE.md`
- operations docs
- scripts if needed

Validation:

- completed restore drill record

Acceptance:

- Restore is tested, not assumed.

### GOV-002 - S3 and File Access Governance

Priority: P2

Goal: protect scans, reports, and uploaded medical files.

Steps:

1. Identify buckets and object prefixes.
2. Confirm private bucket policy.
3. Confirm encryption at rest.
4. Confirm least-privilege credentials.
5. Confirm presigned URL expiry.
6. Add operational documentation.

Expected files:

- S3 service/config docs
- environment docs

Validation:

- policy review
- upload/read smoke

Acceptance:

- Medical files are private by default and accessed through controlled paths.

### GOV-003 - Retention and Access Review

Priority: P2

Goal: make long-term data access auditable.

Steps:

1. Classify sensitive tables and object types.
2. Define retention periods.
3. Define deletion/anonymization process where legally/operationally applicable.
4. Review active users and roles.
5. Schedule quarterly access review.
6. Document incident response for leaked secrets/signing keys.

Expected files:

- governance docs
- admin runbook

Validation:

- completed first access review

Acceptance:

- Sensitive data has documented ownership, retention, and review process.

## Validation Command Set

Minimum per code batch:

```powershell
pnpm check
```

Security/session/authorization batches:

```powershell
pnpm test
pnpm db:migration-files-check
```

Deployment/release batches:

```powershell
pnpm build
pnpm smoke
```

UI/mobile-impacting batches:

```powershell
pnpm test:ui
```

Database-sensitive batches:

```powershell
pnpm db:sync-check
```

Only claim a check passed if it actually ran in the current environment. If a
check is blocked by environment, missing database credentials, or unrelated
TypeScript errors, record the exact blocker.

## Goals

- Reduce public information exposure.
- Make production startup and deployment deterministic.
- Classify and remove sensitive signing material where applicable.
- Make authorization and session behavior testable.
- Add release checks that prove the running service matches the intended build.
- Improve performance and maintainability without a large rewrite.

## Non-Goals

- No broad UI redesign as part of hardening.
- No unrelated refactors while the working tree has open changes.
- No database or Android signing changes without a backup and explicit operator
  confirmation.
- No claim of production readiness until live database, service restart, and
  smoke checks are verified.

## Current Constraints

- The working tree currently has many modified/untracked files, so every change
  must be scoped and reviewed before commit.
- `SRV100` serves the built backend from `dist/index.js` on port `4000`.
- Web asset deployment, Android APK rebuild, and installed Android app behavior
  are separate delivery paths.
- The public health endpoint is also consumed by client/runtime code, so callers
  must be checked before changing its response shape.

## Phase 0 - Baseline and Release Branch

Objective: create a clean, reviewable starting point before security changes.

Steps:

1. Capture `git status --short`.
2. Classify existing changes:
   - intended product changes,
   - generated/cache files,
   - Android splash/icon changes,
   - graphify artifacts,
   - unrelated local experiments.
3. Create a hardening branch when the baseline is agreed:
   `codex/security-release-hardening`.
4. Decide whether to commit, shelve, or leave unrelated changes untouched.
5. Record the current intended release commit and schema migration state.

Exit criteria:

- Hardening work is isolated from unrelated local changes.
- The release baseline is known and reproducible.

## Phase 1 - P0 Public Exposure and Startup Safety

Objective: close the fastest high-risk release issues.

### 1. Public `/healthz`

Steps:

1. Change public `/healthz` to return only minimal liveness data.
2. Remove unauthenticated exposure of:
   - environment,
   - build time,
   - commit,
   - patient counts,
   - raw database errors.
3. Add or reuse an authenticated admin readiness endpoint for detailed status.
4. Update client callers that currently expect detailed `/healthz` fields.
5. Add a regression check that public `/healthz` does not expose business or DB
   details.

Expected files:

- `server/_core/index.ts`
- `client/src/App.tsx`
- `client/src/features/admin/AdminStatus.tsx`
- `client/src/components/MobileAppEnhancements.tsx`
- tests or smoke scripts if available

Exit criteria:

- Public `/healthz` returns minimal data.
- Admin diagnostics still show useful status through an authenticated path.
- TypeScript check passes.

### 2. Production Port Binding

Steps:

1. Keep automatic fallback port selection in development.
2. In production, fail fast if the configured `PORT` is unavailable.
3. Log a clear production error when the preferred port is busy.
4. Confirm NSSM/reverse proxy expectations still target port `4000`.

Expected files:

- `server/_core/index.ts`

Exit criteria:

- Development remains convenient.
- Production cannot silently boot on the wrong port.

### 3. Android Signing Key Classification

Steps:

1. Identify all tracked keystore files.
2. Check Android build scripts and Gradle configuration to determine whether any
   tracked key is used for real releases.
3. If a tracked key is production/reusable, treat it as compromised and plan
   rotation.
4. Move real signing material out of Git into a protected local/CI secret path.
5. Add `.gitignore` and secret scanning coverage for keystores and private keys.
6. Keep only documented test keys or fingerprints in the repository if needed.

Expected files:

- `android/**`
- `scripts/build-android-release.ps1`
- `.gitignore`
- CI workflow files

Exit criteria:

- Every tracked keystore is classified as test, obsolete, or compromised.
- No production signing secret remains as an ordinary tracked source file.

## Phase 2 - Sessions and Request Protection

Objective: reduce risk from stolen cookies, replayed tokens, and cross-site
state-changing requests.

Steps:

1. Add a server-side session identifier to issued auth sessions.
2. Persist active sessions with expiration and revocation state.
3. Make logout revoke the server-side session, not only clear cookies.
4. Revoke existing sessions on password change and user deactivation.
5. Move login rate limiting from process memory to a TTL-backed shared store, or
   add bounded cleanup as an interim step.
6. Add strict Origin/Referer or CSRF protection for browser state-changing
   requests.
7. Add security headers at the server or proxy boundary:
   - HSTS where HTTPS is guaranteed,
   - frame protection,
   - content-type sniffing protection,
   - a measured CSP after checking current asset requirements.

Expected files:

- `server/_core/auth.ts`
- `server/_core/context.ts`
- auth-related tests
- database migration for session records if needed

Exit criteria:

- Logout and password changes invalidate old sessions.
- Login throttling survives process restart or has explicit bounded cleanup.
- State-changing browser requests have a clear CSRF/origin boundary.

## Phase 3 - Authorization Model

Objective: make sensitive access deterministic, server-side, and covered by
tests.

Steps:

1. Inventory all sensitive procedures:
   - medical records,
   - attendance,
   - salary/payroll,
   - accounting,
   - admin,
   - patient portal,
   - doctor portal,
   - KF workflows.
2. Define explicit capabilities, for example:
   - `medical.read`
   - `medical.write`
   - `attendance.read`
   - `attendance.write`
   - `salary.read`
   - `salary.write`
   - `accounting.read`
   - `accounting.write`
3. Make server-side capability checks the source of truth.
4. Keep client route checks as UX only.
5. Reduce special-case role bypasses gradually, starting with salary,
   attendance, and medical data.
6. Add role-by-procedure matrix tests.
7. Add negative portal ownership tests for cross-patient and cross-doctor
   access.

Expected files:

- `server/_core/procedures.ts`
- router files under `server/routers/`
- `client/src/lib/page-permissions.ts`
- `client/src/components/ProtectedRoute.tsx`
- permission tests

Exit criteria:

- Sensitive procedures map to explicit capabilities.
- A matrix test proves allow/deny behavior for each role.
- Client visibility no longer hides missing server authorization coverage.

## Phase 4 - Verified Deployment and Rollback

Objective: replace the current build wrapper with a release process that proves
what is running.

Steps:

1. Update deployment automation to run:
   - dependency install,
   - TypeScript check,
   - tests,
   - production build,
   - migration preflight,
   - backup/checkpoint,
   - NSSM service restart,
   - readiness check,
   - smoke test,
   - rollback on failure.
2. Record deployed commit, package version, build time, and migration state.
3. Separate web deployment from Android and desktop packaging.
4. Add clear operator logs for success, failure, and rollback.
5. Document the one-command release path.

Expected files:

- `scripts/deploy-web.ps1`
- `scripts/smoke.ts`
- `package.json`
- release documentation

Exit criteria:

- A failed deploy does not silently leave the system in an unknown state.
- The operator can prove which commit and schema version are live.

## Phase 5 - CI and Test Coverage

Objective: make release confidence come from automated checks, not manual
inspection only.

Steps:

1. Split CI into clear jobs:
   - install/cache,
   - TypeScript,
   - unit/backend tests,
   - migration file validation,
   - production build.
2. Add Playwright smoke tests using a disposable seeded database.
3. Cover critical flows:
   - login,
   - home,
   - patient file,
   - medical record save,
   - attendance report,
   - salary/payroll access,
   - admin diagnostics.
4. Add focused coverage thresholds for authorization, payroll, and attendance.
5. Make CI artifact the source used by deployment where possible.

Expected files:

- `.github/workflows/ci.yml`
- `tests/e2e/**`
- `vitest*.config.ts`
- test fixtures/seeds

Exit criteria:

- Pull requests prove the highest-risk flows before merge.
- E2E failures block release candidates.

## Phase 6 - Performance and Mobile Reliability

Objective: reduce predictable slow paths with production-sized data.

Steps:

1. Replace sequential attendance date loading with one range endpoint.
2. Add pagination or bounded queries for large reports.
3. Add row limits and server-side export jobs for heavy exports.
4. Lazy-load heavy XLSX/PDF/chart/report dependencies by route.
5. Add automated screenshots for key mobile widths:
   - 320 px,
   - 360 px,
   - 390 px,
   - 430 px.
6. Verify Android WebView behavior separately from desktop browser behavior.

Expected files:

- `client/src/features/attendance/DailyView.tsx`
- attendance routers/services
- report/export modules
- Playwright tests

Exit criteria:

- Monthly attendance no longer makes one request per day.
- Large exports have bounded memory behavior and visible progress/error states.
- Mobile critical paths are screenshot-verified.

## Phase 7 - Maintainability Refactor

Objective: split large modules along existing subsystem boundaries without a
rewrite.

Steps:

1. Extract `server/_core/index.ts` responsibilities:
   - health/readiness,
   - auth route registration,
   - static serving,
   - integration endpoints,
   - background job startup.
2. Split `server/db.ts` by bounded context:
   - patients,
   - visits,
   - medical files,
   - accounting,
   - attendance,
   - salary.
3. Constrain dynamic MSSQL table/column identifiers with explicit allowlists.
4. Add characterization tests before moving large logic.
5. Split large client components only when behavior is covered.

Expected files:

- `server/_core/index.ts`
- `server/db.ts`
- `server/integrations/mssqlPatients.ts`
- `client/src/features/salary/PayrollReport.tsx`
- `client/src/components/MedicalFilePanel.tsx`

Exit criteria:

- Smaller modules have clear ownership.
- Refactors do not change behavior without tests proving it.

## Phase 8 - Healthcare Data Governance

Objective: make patient, payroll, image, and integration data handling auditable.

Steps:

1. Document data classification by table/object type.
2. Review S3 bucket privacy, encryption, and presigned URL lifetimes.
3. Verify database and file backup encryption.
4. Define retention and deletion rules.
5. Run and document restore drills.
6. Establish quarterly access reviews.
7. Document incident response steps for leaked credentials or signing keys.

Expected files:

- `BACKUP_RESTORE.md`
- deployment/runbook docs
- S3 and environment configuration docs

Exit criteria:

- Recovery objectives are tested.
- Access to sensitive records is reviewed and documented.
- Backup restore is proven, not only described.

## Recommended Execution Order

Week 1:

1. Baseline classification.
2. Minimal public `/healthz`.
3. Production port fail-fast.
4. Keystore classification.
5. Deployment script version 1.

Week 2:

1. Session revocation.
2. Origin/CSRF protection.
3. Shared or bounded login rate limiting.
4. First permission matrix tests.

Weeks 3-4:

1. Capability-based authorization for salary, attendance, and medical data.
2. Portal ownership negative tests.
3. Playwright smoke tests in CI.
4. Attendance range endpoint.

After Month 1:

1. Verified rollback.
2. Export/report hardening.
3. Large-module refactors.
4. S3, backup, restore, retention, and access-review runbooks.

## First Implementation Batch

Start with these because they are high impact and low blast radius:

1. Reduce public `/healthz`.
2. Add authenticated readiness diagnostics if current admin screens need the
   removed fields.
3. Make production port binding fail fast.
4. Run `pnpm check`.
5. Perform a local smoke check for `/healthz` and admin diagnostics.
