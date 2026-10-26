# Security

Status of the 2026 security and release hardening work, the checks that need outside
access, data classification, and the standing review checklist.

## Hardening status (validated 2026-08-28)

Validation at that date: `pnpm check`, `pnpm test` (14 files, 135 tests), `pnpm build`,
sensitive-file and migration-file checks all passed. `SRV100` deployed with readiness
and smoke checks passing. `security:trpc-inventory` listed 286 procedures by guard: 109
admin, 125 protected, 25 manager, 23 reception, 4 public.

### Done

- Public `/healthz` reduced to liveness only; build diagnostics moved to an
  authenticated admin procedure; no patient counts or raw DB errors in public responses.
- Production startup fails if the configured port (`4000`) is busy.
- Tracked keystores inventoried; future keystore/private-key commits blocked.
- Session revocation through an auth-version mechanism: logout, password change and user
  deactivation invalidate old tokens.
- Login rate limiting hardened (interim, in-memory); Origin protection for browser
  state-changing requests; baseline security headers.
- Sensitive tRPC procedures inventoried; negative portal-ownership tests added.
- Deploy wrapper replaced by a verified build, restart, check, rollback flow with
  migration preflight and deployed-commit recording.
- Attendance: daily sequential loading replaced; large reports paginated or limited.
- Dynamic MSSQL identifiers constrained by allowlists.
- Data classification, retention decision, S3 verification and a restore drill (below).

### Still open

- Decide whether each tracked keystore was production or test; rotate if any was real
  production signing material.
- Capability names for sensitive actions, server-side capability checks as the single
  source of truth, and a role-by-procedure matrix test.
- Range-based attendance endpoint; server-side export jobs; lazy-load heavy report
  libraries; mobile screenshot checks at 320/360/390/430.
- Split `server/_core/index.ts` and `server/db.ts` by responsibility, with
  characterization tests first.
- Verify encrypted database backups; establish a recurring access review.
- Playwright smoke flows in CI against a disposable seeded database.

## Verification record

| Area | Result |
| --- | --- |
| S3 (2026-08-28) | Public Access Block fully enabled, Object Ownership `BucketOwnerEnforced`, default encryption AES256, CloudTrail multi-region with log validation, S3 data events limited to the application bucket, latest audit object encrypted with the customer-managed KMS key. Uploads request `AES256`; download URLs are presigned for 60 to 3600 seconds. |
| Restore drill (2026-08-28) | Restored into `selrs_restore_drill_20260828`: checksum verified, 117 tables, backend tests passed 47/47. The restore script strips source database-selection statements and requires explicit authorization (`ALLOW_DB_RESTORE=1`). |
| Database backups | Pending: confirm encryption at rest and in transfer, retention, and deletion rules with the data owner. |
| Android signing | Pending: classify keystores, rotate if needed, store release values only in CI secrets or the untracked `android/key.properties`; record the certificate fingerprint after `pnpm android:build-release`. |
| Access review | Pending: export active users and roles monthly, disable leavers immediately, review admin and finance access at least monthly, keep the evidence. |

Record the date, operator and evidence for every check; never mark one complete without them.

## Data classification

| Class | Examples | Rules |
| --- | --- | --- |
| Restricted: medical and identity | Patient names, phones, identifiers, diagnoses, examinations, prescriptions, Pentacam files, referrals, portal records | Only in the application database or private object storage. Access needs a server-side role or patient-session ownership check. Never in public health responses, logs, screenshots or error messages. Exports and backups are access-controlled. |
| Restricted: credentials | Passwords, JWT secrets, database URLs, cloud credentials, signing keys, certificates | Environment variables or a secret manager. Never committed, logged or in client bundles. Rotate reusable production credentials after suspected exposure. |
| Confidential: operations and finance | Attendance, salaries, commissions, accounting entries, audit logs, MSSQL sync details | Access limited by operational role; audit administrative changes; never expose raw database errors or connection details. |
| Internal: product and configuration | Service catalogs, templates, schedules, UI preferences, non-sensitive diagnostics | Shared writes behind manager/admin guards; public endpoints limited to liveness and version. |

Retention (approved): no automatic deletion of medical files, database backups or
CloudTrail logs. Remove backups manually only after review and management approval, and
document and approve any future lifecycle deletion rule before enabling it.

## Standing checklist

Authentication and authorization

- Every procedure touching sensitive data or mutating uses `protectedProcedure` or a
  role procedure; public endpoints are reviewed and justified.
- Backend enforces RBAC; frontend routes use `ProtectedRoute`.
- JWT in secure HttpOnly cookies; logout invalidates the session.

Data handling

- No SQL from the frontend; all input validated with `zod`; all SQL parameterized.
- No PII/PHI in plaintext logs or URLs.

Environment

- No secrets in client code; production secrets only in environment variables; `.env`
  never committed; `.env.example` holds placeholders only.

Auditing

- Audit trail for creating, changing or deleting data (what, who, when).
- Server error logs with context but without sensitive content.

Production hardening

- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`,
  and a CSP where feasible.
- `CORS_ALLOWED_ORIGINS` restricted to known domains.

Backup and recovery

- Regular MySQL backups (see `operations.md`) and a documented rollback plan per deploy.
