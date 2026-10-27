## Summary
Fixes from the module-by-module review (reports in `docs/reviews/`), plus per-session MSSQL year and legacy-year patients. Each fix was developed on its own `fix/*` branch from `main` and merged here; this PR carries all of them.

**Security**
- accounting SQL injection, frontend XSS/cache, push-subscription SSRF, guest-booking abuse, static `/updates` allow-list, KF upload isolation, `system_settings` allow-list, atomic rate limit, correct `trust proxy` hop count

**Permissions**
- write procedures require explicit `:rw` (`writePermissionPath`), audit of write procedures, `medicalManagerProcedure`, OP-history read access, doctor-portal data minimisation, `updatePatient` field whitelist

**Data integrity**
- patient delete in a transaction, patient identity matching, stockroom quantity and last price, duplicate WhatsApp on booking update, closures branch filter, family phone lookup

**Performance / housekeeping**
- core lookup indexes (`drizzle/0109_core_lookup_indexes.sql`), DB pool limits, expired-row purge job, `searchPatients` limit, keyset pagination for link-by-filename

**Year handling**
- MSSQL database year chosen at login (automatic on 1 January); older years are read-all, write-admin
- treasury (`accLedger*`, expenses) limited to the session year
- patients of 2013-2025 live in `selrs13` ... `selrs25` (`syncYearPatients.ts`, one-time import already run); old-year sessions read them read-only. Legacy row ids are negative so no write can hit a live patient.

## Checks
- `tsc --noEmit` clean
- backend: 723 pass; the 2 known failures (`attendance`, `autoReply.integration`) are unchanged
- client: 648/648
- legacy reads verified against the real `selrs25` database

## Before deploying
- run `0109_core_lookup_indexes.sql` in a quiet window (index builds on large tables)
- review accountant access and the `:rw` permission for user ids 19, 30, 33, 34, 46, 56, 59, 88, 93, 101
- old-year sessions: patient list, search and file only; bookings, queue and clinical exams stay on the current year

🤖 Generated with [Claude Code](https://claude.com/claude-code)
