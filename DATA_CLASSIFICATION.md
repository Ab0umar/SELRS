# SELRS Data Classification

## Classes

### Restricted: Medical and Identity Data

Patient names, phone numbers, identifiers, diagnoses, examinations,
prescriptions, Pentacam files, referrals, and portal records.

- Store only in the application database or private object storage.
- Access requires a server-side role or patient-session ownership check.
- Do not include values in public health responses, logs, screenshots, or error messages.
- Exports and backups must be access-controlled and retained only as long as required.

### Restricted: Credentials and Security Material

Passwords, JWT secrets, database URLs, cloud credentials, signing keys, and
private certificates.

- Keep in environment variables or a secret manager.
- Never commit, log, or place them in client bundles.
- Rotate reusable production credentials after suspected exposure.

### Confidential: Operations and Finance

Employee attendance, salaries, commissions, accounting entries, audit logs, and
MSSQL synchronization details.

- Limit access by operational role.
- Keep audit events for administrative changes.
- Do not expose raw database errors or connection details to clients.

### Internal: Product and Configuration Data

Service catalogs, templates, schedules, UI preferences, and non-sensitive
diagnostic metadata.

- Protect shared write operations with the appropriate manager/admin guard.
- Keep public endpoints limited to liveness and version information.

## Retention Baseline

The business owner must approve exact periods. Until approved, do not delete
medical or accounting history automatically. Use soft-delete or archival where
the current workflow requires history, and keep backups separate from live-data
retention decisions.

## Review Checklist

- Review role access at least quarterly and after staff changes.
- Verify S3 bucket privacy, encryption, and lifecycle rules before production use.
- Perform a restore drill against a disposable database before relying on a backup.

## Approved Retention Decision

- Medical files: no automatic deletion.
- Database backups: no automatic deletion; remove manually only after review and
  management approval.
- CloudTrail audit logs: no automatic deletion.
- Any future retention change must be documented and approved before enabling a
  lifecycle deletion rule.
- Record the result, date, database version, and responsible operator for each drill.
