# Original User Request

## Initial Request — 2026-09-03T02:14:25+03:00

This is a document and architecture review task. Do not make code changes or edit files.

Working directory: /mnt/e/selrs.cc
Integrity mode: development
Requested team: Document review

## Context & Scope
Perform an in-depth, adversarial architectural and code review of the Accounting subsystem (`server/services/accounting/` and `server/routers/accounting.ts`) against the codebase design principles (deep vs shallow modules, seams, leverage, locality, deletion test) and repository ADRs (ADR-001 strict module separation, ADR-003 MSSQL read-only boundary).

## Requirements

### R1. Architecture & Seam Evaluation
Evaluate the depth and seams of the 12 accounting service files (`dailyRevenue.service.ts`, `lasikReceipts.service.ts`, `lasikServices.service.ts`, `dashboardSummary.service.ts`, `lasikPatientAccounting.service.ts`, `lasikRevenue.service.ts`, `receiptsInquiry.service.ts`, `lasikCost.service.ts`, `home.service.ts`, `mappers.ts`, `sqlBuilders.ts`, `mssqlAccounting.ts`) against `server/routers/accounting.ts`. Specifically assess whether the 7 single-query service wrappers are shallow pass-throughs according to the deletion test.

### R2. ADR & Boundary Compliance Audit
Audit the data paths between MySQL (`selrs26`) and legacy MSSQL (`op2026`) across the accounting procedures to ensure zero cross-database writes, strict preservation of the patientCode/PAT_CD read-only correlation key, and compliance with ADR-001 and ADR-003.

### R3. Testability & Seam Proposal (No Code Edits)
Deliver a detailed written architectural specification and review report outlining how a unified, deep Accounting Ledger interface can replace the shallow services, how in-memory adapters would enable deterministic testing without a live MSSQL instance, and the exact risk assessment. No files should be modified.

## Acceptance Criteria

### Review Report Quality
- [ ] Explicitly identifies every shallow vs deep module in `server/services/accounting/` with rationale using the codebase-design glossary.
- [ ] Confirms compliance or surfaces violations of ADR-001 and ADR-003.
- [ ] Provides concrete interface signatures for a future deep module without editing existing repository files.
- [ ] Zero source code files in `/mnt/e/selrs.cc` are modified, deleted, or committed.
