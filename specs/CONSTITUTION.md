# SRV100 Constitution

> Canonical copy: `.specify/memory/constitution.md`. This file mirrors it for
> visibility under the user-requested `/specs/` path. If the two diverge, the
> `.specify/memory/` copy wins.

## Core Principles

### I. Strict Module Separation (NON-NEGOTIABLE)
The Medical module and the Accounting module MUST remain strictly separated at every
layer: routes, tRPC routers, database access, permissions, and UI surfaces. Code,
types, or queries from one module MUST NOT import from the other. Cross-module data
linkage is allowed ONLY through the existing `PAT_CD` patient code key, and only at
read-time inside reporting boundaries — never via shared mutation paths.

### II. Service-Based Accounting Only
The Accounting module is service-based. Service revenue, service counts, and any
revenue/expense report MUST be derived from service rows in the MSSQL accounting
database. They MUST NOT be derived from patient identity, doctor identity, or any
medical-side computation. Doctor or patient identifiers may appear as descriptive
columns in a report, but never as the basis of a revenue calculation.

### III. Read-Only Accounting APIs
All Accounting tRPC procedures MUST be `protectedProcedure` queries (read-only). Any
mutation against MSSQL accounting is FORBIDDEN unless an explicit, documented
constitutional amendment authorizes it for a named scope.

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

- **Out of scope (this phase):** OneDrive, full rebuild, DB redesigns, accounting
  write APIs, mobile-first redesign of accounting screens.
- **In scope (this phase):** Add Accounting beside Medical; connect to existing
  MSSQL accounting DB; deliver service-revenue reports matching legacy outputs.
- **UI:** Light mode, web-style. Preserve existing Arabic/English language per
  screen.
- **Permissions:** Frontend `ProtectedRoute` + backend role-based procedures. Keep
  admin bypasses, branch restrictions, path-based permission mapping.
- **API style:** tRPC only, inside `server/routers/`.
- **Data access:** through `server/db.ts` and established helpers; never from FE.

## Development Workflow & Quality Gates

- Claude plans and reviews. Cursor/Codex implement. GPT-5 assists with SQL/report
  logic. Cheap models do bulk extraction. Gemini handles UI variants.
- Every task prompt MUST include: *"Follow the project Constitution and Project
  Principles strictly."*
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

**Version**: 1.0.0 | **Ratified**: 2026-05-03 | **Last Amended**: 2026-05-03
