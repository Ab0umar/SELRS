<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 (template) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (7 principles)
  - System Boundaries & Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md       ⚠ pending (verify Constitution Check aligns with new principles)
  - .specify/templates/spec-template.md       ⚠ pending (verify scope rules match Module Separation)
  - .specify/templates/tasks-template.md      ⚠ pending (verify task categorization includes Owner Model / Tool fields)
  - specs/PROJECT_PRINCIPLES.md               ✅ created (companion doc)
  - specs/CONSTITUTION.md                     ✅ created (mirror of this file)
Follow-up TODOs: None
-->

# SRV100 Constitution

## Core Principles

### I. Strict Module Separation (NON-NEGOTIABLE)
The Medical module and the Accounting module MUST remain strictly separated at every
layer: routes, tRPC routers, database access, permissions, and UI surfaces. Code,
types, or queries from one module MUST NOT import from the other. Cross-module data
linkage is allowed ONLY through the existing `PAT_CD` patient code key, and only at
read-time inside reporting boundaries — never via shared mutation paths.
**Rationale:** Medical is patient/doctor-centric and live; Accounting is service-centric
and read-only. Mixing them risks corrupting clinical workflows or leaking financial
state into clinical screens.

### II. Service-Based Accounting Only
The Accounting module is service-based. Service revenue, service counts, and any
revenue/expense report MUST be derived from service rows in the MSSQL accounting
database. They MUST NOT be derived from patient identity, doctor identity, or any
medical-side computation. Doctor or patient identifiers may appear as descriptive
columns in a report, but never as the basis of a revenue calculation.
**Rationale:** The legacy accounting system is service-driven; aligning to its model
is the only way to match legacy outputs.

### III. Read-Only Accounting APIs
All Accounting tRPC procedures MUST be `protectedProcedure` queries (read-only). Any
mutation (insert/update/delete against MSSQL accounting) is FORBIDDEN unless an
explicit, documented constitutional amendment authorizes it for a named scope.
**Rationale:** The accounting MSSQL database is the system of record for an external
legacy product; writes from this app risk silent data divergence and audit failures.

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
Discrepancies MUST be reconciled or explicitly justified in the spec.
**Rationale:** Users will reject any report whose numbers do not tie out to the legacy
system, regardless of internal correctness.

### VI. Spec-Driven, Minimal-Diff Execution
No implementation work begins before `/specify`, `/plan`, and `/tasks` are produced
and reviewed. Each task MUST carry: Owner Model, Backup Model, Tool, Role, Input,
Output, Prompt, and Acceptance Criteria. Implementations MUST produce the smallest
correct diff; refactors outside the task scope are FORBIDDEN unless required to
satisfy acceptance criteria.
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

- **Out of scope (this phase):** OneDrive integration, full system rebuild, redesign
  of either database, write APIs to accounting MSSQL, mobile-first redesign of
  accounting screens.
- **In scope (this phase):** Add Accounting module beside Medical, connect to existing
  MSSQL accounting database, deliver service-revenue reports matching legacy outputs.
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

- **Planning:** Claude produces Constitution, Principles, `/specify`, `/plan`,
  `/tasks`, prompts, and reviews. Claude does NOT implement.
- **Execution:** Cursor / Codex implement code per assigned task. GPT-5 may assist
  with SQL and report logic. Cheap models (GPT-5 mini, GLM, Kimi) handle bulk text
  extraction. Gemini handles UI alternatives.
- **Per-task contract:** Every task MUST include the prompt line:
  *"Follow the project Constitution and Project Principles strictly."*
- **Verification gates:**
  - `pnpm check` is REQUIRED for any change touching auth, routing, permissions,
    patient flows, shared types, or tRPC contracts.
  - `pnpm test` is REQUIRED when modified code has existing coverage.
  - `pnpm build` is REQUIRED when changing shipped frontend/server behavior.
  - `pnpm smoke` is REQUIRED for workflow-sensitive changes.
  - Reports MUST include a legacy-output comparison artifact (Principle V).
- **Reporting:** Each completed task MUST report: changed files, what changed,
  checks run, checks skipped (with reason).

## Governance

- This Constitution supersedes ad-hoc decisions, model preferences, and convenience
  shortcuts. When CLAUDE.md, a skill, or a model suggestion conflicts with the
  Constitution, the Constitution wins.
- **Amendments** require: (a) a written justification referencing the affected
  principle(s), (b) a version bump per the policy below, (c) a Sync Impact Report
  identifying templates/docs to update, and (d) explicit user approval.
- **Versioning policy (semantic):**
  - MAJOR — backward-incompatible removal or redefinition of a principle.
  - MINOR — new principle or materially expanded section.
  - PATCH — clarifications, wording, typo fixes.
- **Compliance review:** Every `/plan` MUST include a Constitution Check section
  citing each principle and how the plan conforms. Every PR description MUST list
  affected principles and verification commands run.
- **Runtime guidance:** `CLAUDE.md` and `.claude/rules/*.md` provide operational
  guidance and remain subordinate to this Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-03 | **Last Amended**: 2026-05-03
