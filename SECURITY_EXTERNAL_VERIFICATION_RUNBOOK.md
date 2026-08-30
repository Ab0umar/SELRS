# Security External Verification Runbook

This runbook covers checks that require AWS, release-signing, or management
access. Do not mark a check complete without recording the date, operator, and
evidence.

## S3

Status: **Verified on 2026-08-28**.

Verify the production bucket has:

- Block Public Access enabled.
- Default encryption enabled (SSE-S3 or SSE-KMS).
- Object versioning and lifecycle rules approved for medical files.
- IAM access limited to the application identity and required actions only.
- No public bucket policy or public object ACL.

Application evidence already present: uploads and copies request `AES256`, and
download URLs are presigned with a 60-3600 second lifetime.

AWS evidence: Public Access Block is fully enabled, Object Ownership is
`BucketOwnerEnforced`, CloudTrail is multi-region with log validation, S3 Data
Events are restricted to the application bucket, and the latest audit object
is encrypted with the customer-managed KMS key.

## Database Backups

- Confirm backup storage encryption at rest.
- Confirm transfer encryption to backup storage.
- Confirm retention and deletion rules with the data owner.
- Run `pnpm db:backup`, then `pnpm db:restore -DryRun` on an approved host.
- Run a real restore only with `ALLOW_DB_RESTORE=1` and a disposable database.
- Record checksum, table count, and application test results.

## Android Signing

- Identify whether each removed/tracked keystore was test or production.
- If production material was exposed, rotate according to the Play App Signing
  procedure and revoke the old distribution path where applicable.
- Store release values only in CI secrets or the untracked
  `android/app/key.properties` file.
- Run `pnpm android:build-release` and record the signing certificate fingerprint.

## Access Review

- Export active users and roles monthly.
- Confirm each user has only the permissions required for their job.
- Disable leavers immediately and record the approver.
- Review admin and finance access at least monthly.
- Retain the review evidence according to the approved retention policy.

## Sign-off Record

| Area | Owner | Date | Evidence | Status |
| --- | --- | --- | --- | --- |
| S3 | | | | Pending |
| Backups | | | | Pending |
| Android signing | | | | Pending |
| Access review | | | | Pending |
