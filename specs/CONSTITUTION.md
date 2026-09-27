# SRV100 Constitution

> Canonical copy: `.specify/memory/constitution.md`. This file mirrors it for
> visibility under the user-requested `/specs/` path. If the two diverge, the
> `.specify/memory/` copy wins.

## Core Principles

### I. Strict Module Separation with Named Production Bridges

The Medical and Accounting modules MUST remain separately owned: no direct
cross-imports of domain routers, services, or UI; use only established integration
boundaries and the shared `PAT_CD` / `patientCode` key where required. Existing
production integrations are permitted: Medical patient synchronization to MSSQL,
Accounting `addPatientServices` writing its receipt and MySQL patient-service link,
and read-time patient lookup for accounting display. These do not authorize new
cross-module writes or bypassing the established integration helpers.

### II. Service-Based Accounting Only

The Accounting module is service-based. Service revenue, service counts, and any
revenue/expense report MUST be derived from service rows in the MSSQL accounting
database. They MUST NOT be derived from patient identity, doctor identity, or any
medical-side computation. Doctor or patient identifiers may appear as descriptive
columns in a report, but never as the basis of a revenue calculation.

### III. Read-Only Reports and Scoped Production Accounting Writes

Accounting is a live production workflow, not a read-only module. Existing reports
and inquiries remain read-only. Existing writes are authorized only through their
established procedures and data-store boundaries:

- MSSQL receipt/service tables: `addPatientServices`, `deleteReceipt`,
  `updateReceipt`, and `editReceiptServiceLine`.
- MySQL Accounting ledgers/subledgers: existing ledger recalculation/mirroring,
  cashbook, advances, home-fund, InstaPay, loans, and Dr. Saadany procedures/imports.
- Access cashbook: existing administrator-only pull/push procedures.
- Medical-to-MSSQL patient synchronization: existing Medical patient-sync flows.

These writes MUST retain existing authorization guards, validated inputs, database
helpers, and transaction/consistency behavior. New write procedures, broadened
targets, or new cross-module/database write paths require explicit review and a
documented constitutional amendment before implementation.

### IV. Use Existing Databases As-Is

Schema redesigns, destructive migrations, renamed columns, or replacement of
encoding/decoding helpers are FORBIDDEN. New tables MAY be added only when no
existing table answers the need AND the addition does not alter legacy semantics.
The MySQL medical schema and the MSSQL accounting schema are fixed contracts.

### V. Legacy Output Parity

Every Accounting report MUST be validated against the corresponding output of the
legacy accounting system before completion. Acceptance requires a documented
row-level or total-level comparison on a representative date range.

### VI. Spec-Driven, Minimal-Diff Execution

No implementation begins before `/specify`, `/plan`, and `/tasks` are produced and
reviewed. Each task MUST carry: Owner Model, Backup Model, Tool, Role, Input,
Output, Prompt, Acceptance Criteria. Implementations MUST produce the smallest
correct diff; out-of-scope refactors are FORBIDDEN.

### VII. Do Not Break Medical

Any change MUST preserve the current behavior of the Medical module: routes,
permissions, patient/doctor flows, MSSQL patient sync, audit logging. Tasks
touching shared infrastructure MUST run `pnpm check` minimum.

## System Boundaries & Constraints

- **Out of scope (without separate approval):** OneDrive, full rebuild, DB redesigns, new or
  broadened Accounting/Medical write integrations beyond Principle III, mobile-first
  redesign of accounting screens.
- **Current production scope:** Maintain integrated Medical and Accounting workflows,
  established data-store-specific writes/synchronization, and service-revenue reports
  matching legacy outputs. New write paths require approval.
- **UI:** Light mode, web-style. Preserve existing Arabic/English language per
  screen.
- **Permissions:** Frontend `ProtectedRoute` + backend role-based procedures. Keep
  admin bypasses, branch restrictions, path-based permission mapping.
- **API style:** tRPC only, inside `server/routers/`.
- **Data access:** through `server/db.ts` and established helpers; never from FE.

## Development Workflow & Quality Gates

- Claude plans and reviews. Cursor/Codex implement. GPT-5 assists with SQL/report
  logic. Cheap models do bulk extraction. Gemini handles UI variants.
- Every task prompt MUST include: _"Follow the project Constitution and Project
  Principles strictly."_
- Verification: `pnpm check` (auth/routing/permissions/types), `pnpm test` (covered
  logic), `pnpm build` (shipped behavior), `pnpm smoke` (workflows). Reports MUST
  include legacy-output comparison.
- Each completed task reports: changed files, what changed, checks run/skipped.

## Governance

- This Constitution supersedes ad-hoc decisions, model preferences, and shortcuts.
- Amendments require justification, version bump, Sync Impact Report, and user
  approval.
- Versioning: MAJOR = breaking principle change; MINOR = new principle/section;
  PATCH = wording/clarification.
- Every `/plan` MUST include a Constitution Check section.
- `CLAUDE.md` and `.claude/rules/*.md` are operational guidance, subordinate to
  this Constitution.

**Version**: 2.0.0 | **Ratified**: 2026-05-03 | **Last Amended**: 2026-09-25
