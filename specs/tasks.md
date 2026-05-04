# /tasks — SRV100 Accounting Module Phase 1

> Each task follows the mandatory schema from `specs/PROJECT_PRINCIPLES.md §2`.
> Implementation tasks are model-routed per `specs/plan.md §10`. No task may
> begin before tasks it depends on are accepted by Claude review.

---

## Task 01: Establish Constitution and Project Principles

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Governance: ratify the Constitution and Project Principles that govern every
subsequent task.

### Input
- Existing `specs/CONSTITUTION.md`
- Existing `specs/PROJECT_PRINCIPLES.md`
- `AGENTS.md`, `CLAUDE.md`

### Output
- Approved `specs/CONSTITUTION.md` v1.0.0
- Approved `specs/PROJECT_PRINCIPLES.md` v1.0.0
- Sync Impact note (if any future edit)

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Governance Lead.

Task:
Ratify specs/CONSTITUTION.md and specs/PROJECT_PRINCIPLES.md as v1.0.0 for
SRV100 Accounting Phase 1. Confirm the seven principles, the task schema,
and the model routing matrix. Do not modify principles silently; any edit
requires a version bump and a Sync Impact Report.

Rules:
- Do not rewrite principles during a regular task.
- Every downstream prompt must end with the mandatory sentence.
- Constitution beats any conflicting CLAUDE.md / AGENTS.md rule.

Output:
- Confirmation of ratification.
- List of any wording deltas (none expected).
```

### Acceptance Criteria
- `specs/CONSTITUTION.md` exists and is v1.0.0.
- `specs/PROJECT_PRINCIPLES.md` exists and is v1.0.0.
- No downstream task is accepted unless its prompt ends with the mandatory
  sentence.

---

## Task 02: Generate /specify

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Spec author for the Accounting Phase 1 feature.

### Input
- `specs/CONSTITUTION.md`, `specs/PROJECT_PRINCIPLES.md`
- `SRV100_Final.txt`, `Acc_SRV100/SRV100_Plan.txt`,
  `Acc_SRV100/SRV100_UPDATED_FINAL.txt`, `Acc_SRV100/OP_QU.txt`
- Legacy OP `.rtm` reports under `Acc_SRV100/*.rtm`

### Output
- `specs/specify.md` with Goal, Scope, Non-scope, Users/modules,
  System rules, Functional requirements, Non-functional requirements,
  Data boundaries, Legacy matching requirements, Acceptance criteria.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Spec Author.

Task:
Write specs/specify.md for the Accounting Phase 1 feature. Scope is read-only
Lasik (SEC_CD = 15), connected to the existing MSSQL op2026 database,
visible inside the existing SRV100 web app next to the Medical module.

Rules:
- Respect strict module separation (Principle I).
- Revenue is service-based only (Principle II).
- No writes to MSSQL; no changes to Medical.
- Every FR must have a clear acceptance criterion.

Output:
- specs/specify.md covering all sections requested in the outline.
```

### Acceptance Criteria
- `specs/specify.md` exists and includes all 10 required sections.
- Non-scope list explicitly forbids DB redesign, writes, and medical edits.
- Legacy matching section names specific `.rtm` sources per report.

---

## Task 03: Generate /plan

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Plan author.

### Input
- `specs/specify.md`, Constitution, Principles
- Current repo layout (`server/routers`, `server/services/`,
  `server/integrations/mssqlPatients.ts`, `client/src/App.tsx`,
  `client/src/pages/accounting/`)

### Output
- `specs/plan.md` with Architecture overview, Existing system assumptions,
  Medical/Accounting separation, Backend strategy, MSSQL read-only strategy,
  Frontend strategy, Report/print strategy, Testing strategy, Deployment
  considerations, Model routing strategy, Constitution Check.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Plan Author.

Task:
Write specs/plan.md that turns specs/specify.md into a concrete but minimal
architecture + strategy document. Include a Constitution Check table and an
existing-system assumptions section based on the current SRV100 code.

Rules:
- Reuse createMssqlPool; do not propose a new MSSQL connection stack.
- All Accounting procedures must be read-only tRPC queries gated by
  managerProcedure.
- Keep Medical untouched.

Output:
- specs/plan.md covering all requested sections.
```

### Acceptance Criteria
- `specs/plan.md` exists; Constitution Check passes all seven principles.
- Folder structure explicitly places accounting code under
  `server/services/accounting/` and `client/src/pages/accounting/`.
- Model/tool routing strategy matches PROJECT_PRINCIPLES §4.

---

## Task 04: Generate /tasks with Model Routing

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Task author.

### Input
- `specs/specify.md`, `specs/plan.md`, Constitution, Principles

### Output
- `specs/tasks.md` containing 20 tasks, each with the mandatory schema and a
  named Owner Model + Backup Model + Tool.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Task Author.

Task:
Produce specs/tasks.md listing 20 dependency-ordered tasks for Accounting
Phase 1. Each task must have: Owner Model, Backup Model, Tool, Role, Input,
Output, Prompt (ending with the mandatory sentence), Acceptance Criteria,
Dependencies, Constitution Refs.

Rules:
- Group tasks so Backend precedes Frontend; Parity precedes Deployment.
- Never assign Claude to implementation tasks.
- Assign Cursor to multi-file edits inside the repo; Codex as backup.

Output:
- specs/tasks.md.
```

### Acceptance Criteria
- `specs/tasks.md` lists 20 tasks in the exact schema.
- No implementation task has Claude as Owner Model.
- Dependencies form a DAG with Task 01..04 as roots.

---

## Task 05: Analyze Legacy Files / Reports

### Owner Model
GPT-5 mini (bulk extraction)

### Backup Model
GLM / Kimi

### Tool
Cursor (+ cheap model)

### Role
Legacy inventory extractor: summarize the legacy `.rtm` reports into a
structured table of columns/grouping/totals per report.

### Input
- `Acc_SRV100/*.rtm` (all legacy reports)
- `Acc_SRV100/OP_QU.txt`, `Acc_SRV100/lasik_op.txt`
- `Acc_SRV100/SRV100_Plan.txt`

### Output
- `specs/legacy-reports.md` — one section per target report (Daily Revenue,
  Service Revenue, Receipts Inquiry, Patient Account, Doctor Account)
  listing: legacy file, SELECT query, columns, grouping, totals, footer,
  notes.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Legacy Inventory Extractor.

Task:
Read every relevant legacy .rtm and .txt under Acc_SRV100/ and summarize each
target report (Daily Revenue, Service Revenue, Receipts Inquiry, Patient
Account, Doctor Account) into a single specs/legacy-reports.md file.

Rules:
- Do not invent queries; copy what exists in OP_QU.txt and the .rtm files.
- Keep Arabic titles where present in the legacy file.
- Flag ambiguities with TODO: rather than guessing.

Output:
- specs/legacy-reports.md with one section per target report.
```

### Acceptance Criteria
- `specs/legacy-reports.md` exists.
- Each target report has its legacy source path, SELECT query, columns,
  grouping, and totals documented.
- Ambiguities flagged, not invented.

---

## Task 06: Lock Accounting Scope

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Scope controller: freeze the exact list of endpoints, pages, filters, and
out-of-scope items for Phase 1 based on the spec + plan + legacy analysis.

### Input
- `specs/specify.md`, `specs/plan.md`, `specs/legacy-reports.md`

### Output
- `specs/scope-lock.md` with: frozen endpoint list, frozen page list,
  frozen filter parameters per endpoint, frozen out-of-scope list.
- Any executor discovering an unlisted need MUST stop and file a scope
  change request against this file.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Scope Controller.

Task:
Produce specs/scope-lock.md that freezes the Accounting Phase 1 surface:
exact endpoints, exact pages, exact filters, exact out-of-scope items.
Anything not listed in this file requires a scope change request.

Rules:
- Do not expand scope beyond what is in specs/specify.md.
- Out-of-scope list must explicitly include writes, schema changes,
  multi-year DB switching, medical edits, mobile redesign, OneDrive.

Output:
- specs/scope-lock.md.
```

### Acceptance Criteria
- `specs/scope-lock.md` exists and matches specify.md exactly.
- No endpoint or page is listed that is not in specify.md.
- Out-of-scope list is explicit and copy-pastable.

---

## Task 07: Design Accounting API Contracts

### Owner Model
GPT-5

### Backup Model
Claude

### Tool
Cursor

### Role
Contract designer: write zod schemas and TypeScript interfaces for every
accounting endpoint input/output. No runtime code yet.

### Input
- `specs/specify.md`, `specs/plan.md`, `specs/scope-lock.md`

### Output
- `shared/accounting/contracts.ts` with zod schemas for:
  - `dashboardSummaryInput/Output`
  - `dailyRevenueInput/Output`
  - `serviceRevenueInput/Output`
  - `receiptsInquiryInput/Output`
  - `receiptDetailInput/Output`
  - `lasikReceiptsInput/Output`
  - `lasikServicesInput/Output`
  - `lasikRevenueSummaryInput/Output`
  - `patientLasikSummaryInput/Output`

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the API Contract Designer.

Task:
Create shared/accounting/contracts.ts with zod schemas covering every
Accounting Phase 1 endpoint input and output, as frozen in
specs/scope-lock.md. Use camelCase; represent PAT_CD, TR_NO, and SRV_CD as
strings; represent dates as ISO strings; represent money as number.

Rules:
- Do not add endpoints beyond the scope lock.
- Do not import from server/* or client/*.
- Do not add any runtime logic; schemas and type exports only.

Output:
- shared/accounting/contracts.ts.
```

### Acceptance Criteria
- `shared/accounting/contracts.ts` exists with all nine schema pairs.
- `pnpm check` passes.
- No imports from server or client code.

---

## Task 08: Map MSSQL Queries for Accounting Reports

### Owner Model
GPT-5

### Backup Model
Claude

### Tool
Cursor

### Role
SQL author: write parameterized MSSQL queries (as string templates in TS)
for every accounting service, matching the legacy report logic.

### Input
- `specs/legacy-reports.md`, `specs/scope-lock.md`,
  `Acc_SRV100/OP_QU.txt`

### Output
- `server/services/accounting/sqlBuilders.ts` exporting query builder
  functions per endpoint (as pure functions returning `{ sql, params }`).

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the SQL Author.

Task:
Implement server/services/accounting/sqlBuilders.ts with pure functions that
return { sql: string, params: Record<string, unknown> } for each Accounting
Phase 1 endpoint. Base the SQL on specs/legacy-reports.md and
Acc_SRV100/OP_QU.txt.

Rules:
- Use parameterized inputs only (@fromDate, @toDate, @secCd, etc.).
- Default SEC_CD = 15 for Lasik endpoints; allow override for generic ones.
- No INSERT/UPDATE/DELETE verbs anywhere. No EXEC.
- Include the PAJRNRCVH ↔ PAPAT_SRV join on (SEC_CD, TR_TY, TR_NO).
- Apply `s.CNCL IS NULL` filter where the legacy query does.

Output:
- server/services/accounting/sqlBuilders.ts.
```

### Acceptance Criteria
- File exists and exports one builder per endpoint.
- `grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE" server/services/accounting`
  returns zero results.
- Unit test `tests/accounting/sqlBuilders.test.ts` confirms generated SQL
  contains expected WHERE fragments.

---

## Task 09: Implement Backend Accounting Layer

### Owner Model
Codex

### Backup Model
Cursor

### Tool
Cursor

### Role
Backend implementer: build the accounting service layer, the tRPC router,
and register it in `server/routers/index.ts`.

### Input
- `shared/accounting/contracts.ts` (Task 07)
- `server/services/accounting/sqlBuilders.ts` (Task 08)
- Existing `createMssqlPool` in `server/integrations/mssqlPatients.ts`
- Existing `managerProcedure` in `server/_core/procedures.ts`

### Output
- `server/services/accounting/mssqlAccounting.ts` (pool + `mssqlQuery` helper)
- `server/services/accounting/mappers.ts`
- `server/services/accounting/*.service.ts` (one per endpoint, per plan §4.1)
- `server/routers/accounting.ts` (tRPC router with 9 queries)
- `server/routers/index.ts` updated to register `accounting`

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Backend Implementer.

Task:
Implement the Accounting backend layer per specs/plan.md §4. All procedures
are read-only managerProcedure tRPC queries using zod schemas from
shared/accounting/contracts.ts and SQL from
server/services/accounting/sqlBuilders.ts. Register the new router in
server/routers/index.ts.

Rules:
- Do not modify server/routers/medical.ts, server/db.ts, or
  server/integrations/mssqlPatients.ts.
- Reuse createMssqlPool — no new connection config.
- No writes. No mutations. Read-only queries only.
- Keep the diff minimal: only the files listed in Output may change.

Output:
- List of changed files.
- pnpm check result.
- Short note on how to invoke each procedure from a test client.
```

### Acceptance Criteria
- `appRouter.accounting` exists with 9 queries.
- `pnpm check` passes.
- `grep -iE "INSERT|UPDATE|DELETE|EXEC" server/services/accounting server/routers/accounting.ts`
  is empty.
- `server/routers/medical.ts`, `server/db.ts`,
  `server/integrations/mssqlPatients.ts` show **zero** diff on this branch.

---

## Task 10: Add Frontend Module Navigation Separation

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Frontend infra: add a role-gated **Accounting** top-level nav entry, register
accounting lazy routes in `App.tsx`, and ensure `AccountingShell.tsx` wraps
accounting pages with a dedicated sub-nav.

### Input
- `specs/scope-lock.md`
- `client/src/App.tsx`, `client/src/pages/accounting/AccountingShell.tsx`
- Existing nav component (whatever the project uses)

### Output
- Edited `client/src/App.tsx` with lazy routes for accounting.
- Edited existing navigation to add one **Accounting** entry (role-gated).
- `AccountingShell.tsx` wired with sub-nav routes.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Frontend Infra Agent.

Task:
Add an Accounting top-level navigation entry (role-gated to admin, manager,
accountant) and register accounting lazy routes in client/src/App.tsx. Wire
AccountingShell.tsx so its sub-nav covers: Dashboard, Daily Revenue, Service
Revenue, Receipts, Services, Patients, Patient Account, Doctor Account.

Rules:
- Do not modify client/src/components/ProtectedRoute.tsx.
- Do not reshuffle Medical routes.
- Use the existing lazy-route and ProtectedRoute API exactly as other pages
  do.

Output:
- Changed files list.
- Manual verification steps to confirm Medical routes still work.
```

### Acceptance Criteria
- New routes resolve under `/accounting/*`.
- Non-permitted roles see no Accounting entry and get redirected from
  `/accounting/*`.
- Medical pages work exactly as before (spot-check /patients, /dashboard).
- `pnpm check` passes.

---

## Task 11: Build Accounting Dashboard (`AccountingHome.tsx`)

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Frontend implementer: convert the placeholder `AccountingHome.tsx` from
prototype data to live tRPC data.

### Input
- `accounting.dashboardSummary` (Task 09)
- `client/src/pages/accounting/AccountingHome.tsx` (placeholder)

### Output
- `AccountingHome.tsx` live: cards with `totalReceiptsToday`,
  `totalRevenueToday`, `totalReceiptsThisMonth`, `totalRevenueThisMonth`,
  and quick links to the four main reports.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Frontend Implementer (Dashboard).

Task:
Replace the prototype data inside AccountingHome.tsx with live tRPC data
from accounting.dashboardSummary. Show four summary cards and four
navigation buttons (Daily Revenue, Service Revenue, Receipts Inquiry,
Patients Inquiry). Include loading, empty, and error states.

Rules:
- Use only ui primitives already in the project.
- Do not fetch via raw fetch; use the trpc React Query hook.
- Do not alter unrelated pages.

Output:
- Changed files list and a screenshot (or description) of the rendered page.
```

### Acceptance Criteria
- Page renders with live data for a manager user.
- Error and loading states visible.
- No console errors.
- `pnpm check` passes.

---

## Task 12: Build Daily Revenue Screen (`DailyRevenue.tsx`)

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Frontend implementer: wire Daily Revenue page to `accounting.dailyRevenue`.

### Input
- `accounting.dailyRevenue`
- Placeholder `DailyRevenue.tsx`

### Output
- Daily Revenue page with filters (`fromDate`, `toDate`, `sectionCode`,
  `doctorCode`), daily rows table, grand totals row, and a **Print**
  button that navigates to Print Preview.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Frontend Implementer (Daily Revenue).

Task:
Wire client/src/pages/accounting/DailyRevenue.tsx to
accounting.dailyRevenue. Provide filter inputs for fromDate, toDate,
sectionCode (default 15), doctorCode. Render a daily rows table with a
grand totals row. Add a Print button that navigates to /accounting/print
with the payload shape defined in plan §7.

Rules:
- Date inputs default to start of current month → today.
- URL-sync filters via search params for shareable links.
- Do not modify unrelated pages.

Output:
- Changed files list; manual test range (e.g. 2026-04-01..2026-04-30).
```

### Acceptance Criteria
- Returns sensible totals for a known date range.
- Filters actually reshape the query (spot-check with two ranges).
- Print button opens Print Preview with the daily revenue payload.
- `pnpm check` passes.

---

## Task 13: Build Service Revenue Report Screen (`LasikRevenue.tsx`)

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Frontend implementer: service-based revenue report grouped Doctor → Service
with per-group and grand totals.

### Input
- `accounting.serviceRevenue`
- Placeholder `LasikRevenue.tsx`

### Output
- Grouped report (outer group by doctor, inner group by service) with
  counts, sum of gross, sum of paid, sum of discount. Per-doctor subtotal,
  per-service subtotal, grand total. Filters: date range, doctorCode,
  serviceCode, sectionCode.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Frontend Implementer (Service Revenue).

Task:
Wire LasikRevenue.tsx to accounting.serviceRevenue with grouping Doctor →
Service and legacy-matching totals (row count, gross, paid, discount) per
group and grand. Filters: fromDate, toDate, sectionCode (default 15),
doctorCode, serviceCode.

Rules:
- Grouping structure must match legacy اطباء.rtm / TRF_DRSRV1.RTM.
- Collapsible doctor groups are fine; default expanded.
- Print button navigates to /accounting/print.

Output:
- Changed files list; screenshot of the grouped report.
```

### Acceptance Criteria
- Output matches the shape in specs/legacy-reports.md.
- Totals match the legacy parity artifact for the test month (see Task 16).
- Print Preview renders the grouped structure.

---

## Task 14: Build Receipts Inquiry Screen (`ReceiptsInquiry.tsx` + Detail)

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Frontend implementer: receipts list page + receipt detail page.

### Input
- `accounting.receiptsInquiry`, `accounting.receiptDetail`
- Placeholders `LasikReceipts.tsx` / `ReceiptsInquiry.tsx`

### Output
- Receipts inquiry list with filters (`fromDate`, `toDate`, `patientCode`,
  `doctorCode`, `sectionCode`, `trNo`, `trTy`).
- Row click navigates to `/accounting/receipts/:secCd/:trTy/:trNo` which
  shows the receipt header + detail lines and a Print button.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Frontend Implementer (Receipts Inquiry).

Task:
Wire the receipts inquiry page and the receipt detail page. The inquiry
page lists PAJRNRCVH headers; the detail page calls
accounting.receiptDetail to show the header + PAPAT_SRV lines and a
Print button that navigates to /accounting/print.

Rules:
- Handle empty results gracefully.
- Handle MSSQL-only patient codes (0013, 0699) without crash.
- Do not fetch inside the table render — use a single query per page.

Output:
- Changed files list; manual steps to reproduce receipt 15/1/<trNo>.
```

### Acceptance Criteria
- Inquiry page returns expected receipts for a known range.
- Detail page matches the legacy single-receipt layout.
- No crash on `0013` or `0699` patient codes.

---

## Task 15: Build Print Preview (`PrintPreview.tsx`)

### Owner Model
Gemini (UI layout)

### Backup Model
Cursor

### Tool
Cursor (+ Gemini for layout variants)

### Role
Frontend implementer: single Print Preview page that renders the payload
shape from plan §7 into an A4-portrait printable layout.

### Input
- `PrintPreview.tsx` placeholder
- Plan §7 payload shape
- OP `.rtm` structural cues from `specs/legacy-reports.md`

### Output
- `PrintPreview.tsx` + a `PrintPreview.module.css` with `@media print` rules.
- Print button on all report pages hands state to this page.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Print Preview Implementer.

Task:
Build a single /accounting/print page that consumes the payload shape
defined in specs/plan.md §7 (title, meta, columns, rows, groupBy, totals,
footer) and renders a printable A4-portrait layout. Provide a Print button
that triggers window.print(). Ensure @media print CSS removes nav/chrome.

Rules:
- Black-on-white, readable borders.
- Respect Arabic titles when provided.
- Do not add any PDF library in Phase 1.

Output:
- Changed files list; one screenshot of print preview and one of the
  browser print dialog.
```

### Acceptance Criteria
- Page prints cleanly (no site chrome, no colored banners).
- Daily Revenue, Service Revenue, Receipts Detail, and Patient Account all
  open this page and print correctly.
- Structurally matches OP `.rtm` (header / body / totals / footer).

---

## Task 16: Integration Testing Against Legacy Outputs

### Owner Model
GPT-5

### Backup Model
Claude (review only)

### Tool
Cursor + ChatGPT

### Role
Parity engineer: produce a script that compares accounting API outputs to
legacy OP CSV exports for a chosen date range.

### Input
- Legacy CSV exports produced from OP for the reference month (2026-04)
- `accounting.*` tRPC endpoints

### Output
- `scripts/accounting/parity-check.ts` that:
  - calls each accounting endpoint for the reference range,
  - loads the legacy CSV,
  - diffs totals (and a row-level sample for receipts),
  - writes `specs/parity/<report>-<range>.md` with the result.
- Parity artifacts under `specs/parity/` for each report.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Parity Engineer.

Task:
Write scripts/accounting/parity-check.ts that compares accounting API
outputs against legacy OP CSV exports for the reference month 2026-04 on
op2026. For each report (Daily Revenue, Service Revenue, Receipts Inquiry,
Patient Account sample, Doctor Account sample), write a parity markdown
file under specs/parity/ showing totals match or detailing the delta.

Rules:
- Totals must match within ±0.01 currency unit (floating-point tolerance).
- Row counts for Receipts Inquiry must match exactly.
- If a mismatch is found, STOP and file a scope-change request; do not
  silently adjust the query.

Output:
- Script file.
- One parity markdown per report.
- Summary: PASS / FAIL per report.
```

### Acceptance Criteria
- Parity markdown files exist under `specs/parity/`.
- All totals match the legacy CSV for the reference range.
- Receipts Inquiry row count is exact.
- If any mismatch, a scope-change request exists in the PR description.

---

## Task 17: Bug Fixing

### Owner Model
Codex

### Backup Model
Cursor

### Tool
Cursor

### Role
Bug fixer: address issues found during integration testing (Task 16) and
QA review.

### Input
- Parity results (Task 16)
- Reviewer notes from Claude review of Tasks 09–15
- User-reported defects (if any)

### Output
- Smallest-possible diffs per bug.
- Regression tests added for each fixed bug.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Bug Fixer.

Task:
Address blocking issues recorded in specs/parity/ and in reviewer notes
for Tasks 09–15. Produce the smallest correct diff per bug, add a
regression test under tests/accounting/ for each fix, and rerun
pnpm check and pnpm test.

Rules:
- Do not refactor beyond the bug scope.
- Do not change accepted contracts (Task 07) or SQL builders (Task 08)
  without a reviewer-approved scope change.
- Medical module must remain untouched.

Output:
- Bug list with status.
- Diff summary per bug.
- Test results.
```

### Acceptance Criteria
- All blocking issues are resolved.
- `pnpm check` and `pnpm test` both pass.
- No file in the untouchable list was modified.

---

## Task 18: Performance Optimization

### Owner Model
GPT-5

### Backup Model
Codex

### Tool
Cursor

### Role
Performance engineer: measure and, if needed, optimize accounting queries
and UI data flows to meet NFR-1 (≤2s for a 30-day window on op2026).

### Input
- Built Accounting module (Tasks 09–15)
- Representative date ranges from Task 16

### Output
- `specs/perf-report.md` with timings per endpoint before/after.
- Query-level optimizations (only index hints or rewrites that preserve
  semantics; no new indexes created on MSSQL — index creation is out of
  scope).
- Frontend wins if any (memoization, query key tuning, lazy groups).

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Performance Engineer.

Task:
Measure each accounting endpoint against NFR-1. If over 2s for a 30-day
window, propose and apply semantics-preserving rewrites (no new MSSQL
indexes, no new tables, no new DB objects). Produce specs/perf-report.md
with before/after timings and the list of changes.

Rules:
- Do not alter output semantics.
- Do not introduce new DB objects or schema changes.
- Legacy parity (Task 16) must still pass after changes.

Output:
- specs/perf-report.md.
- Rerun parity-check.ts and attach result.
```

### Acceptance Criteria
- Each endpoint meets NFR-1 on the reference dataset.
- Parity still passes.
- No DB object creation.

---

## Task 19: Deployment Preparation

### Owner Model
Cursor

### Backup Model
Codex

### Tool
Cursor

### Role
Release engineer: ensure build, start, and PM2 ecosystem remain green; no
new env vars; document rollback.

### Input
- Built Accounting module
- `ecosystem.config.js`, `package.json`, `.env.example`

### Output
- `specs/deploy-notes.md` describing: commands run (`pnpm build`,
  `pnpm start`), verification URL list, rollback procedure (revert feature
  branch), new env vars (expected: none), manual smoke checklist.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Release Engineer.

Task:
Prepare Accounting Phase 1 for deployment. Confirm pnpm build succeeds,
pnpm start runs, PM2 ecosystem file needs no changes, and no new env vars
are required. Document the rollback plan (branch revert) and a manual
smoke checklist. Do not modify production configuration files beyond what
is strictly necessary.

Rules:
- No new env vars.
- No changes to ecosystem.config.js unless unavoidable and documented.
- No migrations.

Output:
- specs/deploy-notes.md.
- Build + start logs attached or summarized.
```

### Acceptance Criteria
- `pnpm build` succeeds.
- `pnpm start` serves the built app.
- Deploy notes list rollback, smoke checks, and confirm no env/config
  additions.

---

## Task 20: Final Review

### Owner Model
Claude

### Backup Model
GPT-5

### Tool
Claude

### Role
Final reviewer: run the review template over every accepted task and issue
a Phase 1 sign-off.

### Input
- Completed Tasks 05–19 outputs
- `specs/claude_review_prompt.md`

### Output
- `specs/phase1-signoff.md` with per-task Approved / Needs Fixes status,
  remaining non-blocking improvements, and a final "ready to merge" decision.

### Prompt
```text
Follow the project Constitution and Project Principles strictly.

You are the Final Reviewer.

Task:
Run the Claude review template (specs/claude_review_prompt.md) against each
executed task (05 through 19). Produce specs/phase1-signoff.md with a clear
verdict per task and a single final decision: READY TO MERGE or HOLD.

Rules:
- A single unresolved blocking issue → HOLD.
- Scope creep anywhere → HOLD until resolved.
- Medical must be demonstrably untouched (confirmed by diff inspection).

Output:
- specs/phase1-signoff.md.
- Final verdict.
```

### Acceptance Criteria
- `specs/phase1-signoff.md` exists.
- Final verdict is clear and justified.
- Each task has an explicit Approved / Needs Fixes entry.

---

**Tasks version:** 1.0.0 — aligned with Constitution v1.0.0, Principles v1.0.0,
Spec v1.0.0, Plan v1.0.0.
