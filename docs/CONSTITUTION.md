# SRV100 Constitution

## Core Principles

### I. Strict Module Separation with Named Production Bridges

The Medical and Accounting modules MUST remain separately owned: no direct
cross-imports of domain routers, services, or UI; use only established integration
boundaries and the shared `PAT_CD` / `patientCode` key where required. Existing
production integrations are permitted: Medical patient synchronization to MSSQL,
Accounting `addPatientServices` writing its receipt and MySQL patient-service link,
and read-time patient lookup for accounting display. These do not authorize new
cross-module writes or bypassing the established integration helpers.
**Rationale:** Medical is patient/doctor-centric and Accounting is service-centric.
Production requires bounded synchronization and service-link workflows; the boundary
is enforced by designated integrations, not by pretending no integration exists.

### II. Service-Based Accounting Only

The Accounting module is service-based. Service revenue, service counts, and any
revenue/expense report MUST be derived from service rows in the MSSQL accounting
database. They MUST NOT be derived from patient identity, doctor identity, or any
medical-side computation. Doctor or patient identifiers may appear as descriptive
columns in a report, but never as the basis of a revenue calculation.
**Rationale:** The legacy accounting system is service-driven; aligning to its model
is the only way to match legacy outputs.

### III. Read-Only Reports and Scoped Production Accounting Writes

Accounting is a live production workflow, not a read-only module. Existing report and
inquiry procedures remain read-only. Existing writes are authorized only through
their established procedures and data-store boundaries:

- MSSQL receipt/service tables: `addPatientServices`, `deleteReceipt`,
  `updateReceipt`, and `editReceiptServiceLine`.
- MySQL Accounting ledgers/subledgers: existing ledger recalculation/mirroring,
  cashbook, advances, home-fund, InstaPay, loans, and Dr. Saadany procedures and
  imports in `accountingRouter`.
- Access cashbook integration: existing administrator-only Access pull/push
  procedures (`triggerAccSync`, `triggerAccPush`).
- Medical-to-MSSQL patient synchronization: existing Medical patient sync flows;
  this is an established integration, not permission for arbitrary cross-writes.

These writes MUST retain their existing authorization guards, validated inputs,
database helpers, and transaction/consistency behavior. New write procedures,
broadened targets, or new cross-module/database write paths require explicit review
and a documented constitutional amendment before implementation.
**Rationale:** The production system already performs these writes across distinct
stores. The enforceable boundary is the approved route/helper and data-store scope;
describing the entire module as read-only is inaccurate and unsafe for future work.

### IV. Use Existing Databases As-Is

Schema redesigns, destructive migrations, renamed columns, or replacement of
encoding/decoding helpers (mojibake handling in `server/db.ts`) are FORBIDDEN.
New tables MAY be added only when no existing table answers the need AND the addition
does not alter legacy semantics. The MySQL medical schema and the MSSQL accounting
schema are treated as fixed contracts.
**Rationale:** Both databases back live operations and historical reports; structural
changes invalidate years of legacy data and reports.

### V. Legacy Output Parity

Every Accounting report MUST be validated against the corresponding output of the
legacy accounting system before it is considered complete. Acceptance requires a
documented row-level or total-level comparison on a representative date range.
Discrepancies MUST be reconciled or explicitly justified in the change description.
**Rationale:** Users will reject any report whose numbers do not tie out to the legacy
system, regardless of internal correctness.

### VI. Minimal-Diff Execution

Implementations MUST produce the smallest correct diff; refactors outside the scope
of the change are FORBIDDEN unless required to make the change work.
**Rationale:** Scope creep and unbounded refactors are the primary risk to the live
Medical module.

### VII. Do Not Break Medical

Any change MUST preserve the current behavior of the Medical module: routes,
permissions (`ProtectedRoute`, role-based procedures), patient/doctor flows,
MSSQL patient sync, and existing audit logging. A task that touches shared
infrastructure (router composition, auth context, shared types) MUST run `pnpm check`
at minimum and report the result.
**Rationale:** Medical is in production use; regressions are not recoverable by a
later patch cycle.

## System Boundaries & Constraints

- **Out of scope (without separate approval):** OneDrive integration, full system rebuild, redesign
  of either database, new or broadened Accounting/Medical write integrations beyond
  the established flows named in Principle III, mobile-first redesign of accounting
  screens.
- **Current production scope:** Maintain the integrated Medical and Accounting
  workflows, their established data-store-specific writes/synchronization, and
  service-revenue reports matching legacy outputs. New write paths require approval.
- **UI:** Light mode, web-style layouts. Arabic/English mixed text MUST be preserved
  per the existing screen's language convention; do not translate labels unless the
  surrounding screen is already in the target language.
- **Permissions:** New Accounting routes MUST be gated by `ProtectedRoute` on the
  frontend AND by role-based procedures in `server/_core/procedures.ts`. Admin
  bypasses, branch restrictions, and path-based permission mapping MUST be preserved.
- **API style:** All new endpoints MUST live inside the existing tRPC router
  structure (`server/routers/`). No parallel REST/GraphQL surface.
- **Data access:** All DB access MUST go through `server/db.ts` or established backend
  helpers. Frontend code MUST NOT issue direct DB queries.

## Development Workflow & Quality Gates

- **Verification gates:**
  - `pnpm check` is REQUIRED for any change touching auth, routing, permissions,
    patient flows, shared types, or tRPC contracts.
  - `pnpm test` is REQUIRED when modified code has existing coverage.
  - `pnpm build` is REQUIRED when changing shipped frontend/server behavior.
  - `pnpm smoke` is REQUIRED for workflow-sensitive changes.
  - Reports MUST include a legacy-output comparison artifact (Principle V).
- **Reporting:** Each completed change MUST report: changed files, what changed,
  checks run, checks skipped (with reason).

## Governance

- This Constitution supersedes ad-hoc decisions, model preferences, and convenience
  shortcuts. When CLAUDE.md, a skill, or a model suggestion conflicts with the
  Constitution, the Constitution wins.
- **Amendments** require: (a) a written justification referencing the affected
  principle(s), (b) a version bump per the policy below, (c) a list of
  docs to update, and (d) explicit user approval.
- **Versioning policy (semantic):**
  - MAJOR — backward-incompatible removal or redefinition of a principle.
  - MINOR — new principle or materially expanded section.
  - PATCH — clarifications, wording, typo fixes.
- **Compliance review:** Every PR description MUST list
  affected principles and verification commands run.
- **Runtime guidance:** `CLAUDE.md` and `.claude/rules/*.md` provide operational
  guidance and remain subordinate to this Constitution.

**Version**: 2.0.0 | **Ratified**: 2026-05-03 | **Last Amended**: 2026-10-26 (workflow sections only: spec-driven process, task schema, and model routing removed)
