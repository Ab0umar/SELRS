# ADR-004: Production Accounting Writes and Established Integrations

**Date:** 2026-09-25  
**Status:** Adopted

## Context

ADR-001 through ADR-003 and the original project rules described the Accounting
module as read-only and prohibited cross-database writes. Those decisions captured
Phase 1 development scope. The current application is live in production and already
supports Accounting writes across MSSQL, MySQL, and the Access cashbook, plus Medical
patient synchronization to MSSQL. Treating these implemented flows as forbidden
would misstate the production system and create false review failures.

## Decision

1. Preserve the established production procedures and integration helpers as the
   current authorized write surface; do not treat the Accounting module as
   read-only.
2. MSSQL receipt/service writes remain limited to `addPatientServices`,
   `deleteReceipt`, `updateReceipt`, and `editReceiptServiceLine` and their current
   integration helpers.
3. MySQL Accounting writes remain within the current guarded ledger/cashbook,
   advances, home-fund, InstaPay, loans, and Dr. Saadany procedures/imports.
4. Access cashbook synchronization remains limited to the administrator-only
   `triggerAccSync` and `triggerAccPush` procedures.
5. Existing Medical-to-MSSQL patient synchronization and Accounting's
   `addPatientServices` MySQL service-link behavior remain established integrations.
6. Preserve current authorization guards, validated inputs, database-specific
   helpers, and transaction/consistency behavior. New procedures, broader target
   tables, or new cross-module/database write paths require a separately documented
   owner approval before implementation.
7. Report and inquiry procedures remain read-only. Revenue derivation remains based
   on MSSQL accounting service/receipt rows, not medical-side counts.

## Consequences

- Production policy now describes actual operation instead of Phase 1 test scope.
- ADR-002 is superseded for current Accounting behavior. ADR-001 and ADR-003 are
  superseded only where their absolute no-shared-write/no-cross-database-write rules
  conflict with the named existing integrations; their other boundaries remain.
- The listed procedures and database targets form a bounded current baseline, not a
  general authorization for arbitrary writes.
- Phase 1 specs, plans, sign-off, and deployment notes remain historical records and
  must not be used as current production policy.
