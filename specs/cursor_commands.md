# cursor_commands.md — SRV100 Accounting Phase 1

Ready-to-copy Cursor commands for every **implementation** task in
`specs/tasks.md` (Tasks 05 through 19). Tasks 01–04 and Task 20 are
Claude-only (governance, specs, review) and are not included here.

Each block is self-contained: copy the whole block into Cursor.

---

## Task 05 — Analyze Legacy Files / Reports

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/tasks.md (Task 05 section)
- Acc_SRV100/OP_QU.txt
- Acc_SRV100/lasik_op.txt
- Acc_SRV100/SRV100_Plan.txt
- Acc_SRV100/*.rtm

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for a bulk-extraction task.

Task:
Implement ONLY Task 05: Analyze Legacy Files / Reports.
Produce specs/legacy-reports.md with one section per target report (Daily
Revenue, Service Revenue, Receipts Inquiry, Patient Account, Doctor
Account) listing: legacy file path, verbatim SELECT query, visible columns,
grouping, totals, footer, notes.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes (this task only writes one markdown file).
- Use existing project structure and style.
- Do not invent queries — copy from OP_QU.txt and the .rtm files. Flag
  ambiguities with TODO:.

Before writing:
1. Inspect Acc_SRV100/ to list which .rtm files map to which target report.
2. Read OP_QU.txt for the canonical SELECT queries.
3. Outline the markdown sections before filling them.

After writing:
1. List changed files (should be just specs/legacy-reports.md).
2. Explain how to verify (grep for each target report title).
3. List assumptions and TODO items.

Acceptance Criteria:
- specs/legacy-reports.md exists with one section per target report.
- Each section has: legacy source path, SELECT query, columns, grouping,
  totals.
- No invented queries; TODO: lines mark every ambiguity.
```

---

## Task 06 — Lock Accounting Scope

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 06 section)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for a scope-freezing task.

Task:
Implement ONLY Task 06: Lock Accounting Scope.
Produce specs/scope-lock.md that freezes:
- the exact list of 9 endpoints (from specs/specify.md §6 + plan §4.2)
- the exact list of pages under client/src/pages/accounting/
- the exact filter parameter set per endpoint
- the explicit out-of-scope list (writes, schema changes, multi-year DB
  switching, medical edits, mobile redesign, OneDrive).

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes (single markdown file).
- Mirror the spec exactly; do not expand.

Before writing:
1. Cross-check every endpoint in specify.md and plan.md.
2. Confirm the page list matches client/src/pages/accounting/.

After writing:
1. List changed files (only specs/scope-lock.md).
2. Explain how to test (diff the endpoint list against plan.md §4.2).
3. List assumptions (none expected).

Acceptance Criteria:
- specs/scope-lock.md exists and lists exactly 9 endpoints.
- Page list matches specs/specify.md §6.
- Out-of-scope list explicitly bans writes, schema changes, multi-year DB,
  medical edits, mobile redesign, OneDrive.
```

---

## Task 07 — Design Accounting API Contracts

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 07 section)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for contract design.

Task:
Implement ONLY Task 07: Design Accounting API Contracts.
Create shared/accounting/contracts.ts with zod schemas and inferred
TypeScript types for every Accounting Phase 1 endpoint input and output
(9 endpoints). Use camelCase; PAT_CD/TR_NO/SRV_CD as strings; dates as
ISO strings; money as number.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes (one new file: shared/accounting/contracts.ts).
- Do not import from server/* or client/*.
- Do not add runtime logic — schemas and types only.

Before writing:
1. Inspect existing shared/ structure and current zod usage.
2. Identify all input/output fields from specs/plan.md §4.2 + scope-lock.

After writing:
1. Run pnpm check.
2. List changed files.
3. Explain how to import these schemas from the server router.
4. List assumptions or open questions.

Acceptance Criteria:
- shared/accounting/contracts.ts exports all 9 input/output schema pairs
  and their inferred types.
- pnpm check passes.
- File contains zero imports from server or client code.
```

---

## Task 08 — Map MSSQL Queries for Accounting Reports

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 08 section)
- Acc_SRV100/OP_QU.txt

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for SQL authoring.

Task:
Implement ONLY Task 08: Map MSSQL Queries for Accounting Reports.
Create server/services/accounting/sqlBuilders.ts exporting one pure builder
function per endpoint, each returning { sql: string, params: Record<string,
unknown> }. Base queries on specs/legacy-reports.md and Acc_SRV100/OP_QU.txt.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes (one new file).
- Use parameterized inputs only (@fromDate, @toDate, @secCd, etc.).
- Default SEC_CD = 15 for Lasik endpoints; optional override for generic
  endpoints.
- No INSERT/UPDATE/DELETE/EXEC/MERGE verbs anywhere.
- Apply s.CNCL IS NULL where the legacy query does.

Before writing:
1. Inspect OP_QU.txt for canonical queries.
2. Plan the WHERE-fragment helpers (date, section, doctor, patient,
   service).

After writing:
1. Run pnpm check.
2. Grep for forbidden verbs inside server/services/accounting.
3. List changed files.
4. Describe how the SQL builders will be called by the service layer.

Acceptance Criteria:
- sqlBuilders.ts exports one builder per endpoint.
- grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE" server/services/accounting
  returns zero results.
- pnpm check passes.
```

---

## Task 09 — Implement Backend Accounting Layer

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 09 section)
- shared/accounting/contracts.ts
- server/services/accounting/sqlBuilders.ts
- server/integrations/mssqlPatients.ts (read-only reference)
- server/_core/procedures.ts
- server/routers/index.ts

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for backend integration.

Task:
Implement ONLY Task 09: Implement Backend Accounting Layer.
Create:
- server/services/accounting/mssqlAccounting.ts (pool wrapper + mssqlQuery)
- server/services/accounting/mappers.ts
- server/services/accounting/<endpoint>.service.ts (one per endpoint)
- server/routers/accounting.ts (tRPC router, 9 queries using managerProcedure)
Register the new router in server/routers/index.ts.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT modify server/routers/medical.ts.
- Do NOT modify server/db.ts.
- Do NOT modify server/integrations/mssqlPatients.ts.
- Reuse createMssqlPool from server/integrations/mssqlPatients.ts.
- All procedures are read-only tRPC queries using managerProcedure and
  zod schemas from shared/accounting/contracts.ts.
- No INSERT/UPDATE/DELETE anywhere.

Before writing:
1. Inspect server/routers/index.ts to confirm the registration pattern.
2. Inspect a similar router (patient.ts) for style consistency.
3. Plan the mapping from raw MSSQL columns (UPPERCASE) to DTO (camelCase).

After writing:
1. Run pnpm check.
2. Run grep for forbidden verbs in server/services/accounting and
   server/routers/accounting.ts.
3. Verify the three untouchable files are unchanged (git diff --stat).
4. List changed files.
5. Describe how to call each procedure from the tRPC client.

Acceptance Criteria:
- appRouter.accounting exposes 9 queries.
- pnpm check passes.
- git diff --stat shows zero changes to server/routers/medical.ts,
  server/db.ts, server/integrations/mssqlPatients.ts.
- No mutating SQL verbs appear under server/services/accounting or
  server/routers/accounting.ts.
```

---

## Task 10 — Add Frontend Module Navigation Separation

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 10 section)
- client/src/App.tsx
- client/src/pages/accounting/AccountingShell.tsx
- client/src/components/ProtectedRoute.tsx (read-only reference)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for frontend routing.

Task:
Implement ONLY Task 10: Add Frontend Module Navigation Separation.
- Add lazy routes in client/src/App.tsx for: /accounting (Home),
  /accounting/daily-revenue, /accounting/service-revenue,
  /accounting/receipts, /accounting/receipts/:secCd/:trTy/:trNo,
  /accounting/services, /accounting/patients,
  /accounting/patient/:patientCode, /accounting/doctor/:doctorCode,
  /accounting/print.
- Wrap each route with ProtectedRoute and allowedRoles=['admin','manager',
  'accountant'].
- Ensure AccountingShell.tsx provides the sub-nav per plan §6.2.
- Add one Accounting entry to the main navigation (role-gated).

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT modify client/src/components/ProtectedRoute.tsx.
- Use the existing lazy-route pattern; do not introduce a new router
  library.

Before writing:
1. Inspect App.tsx lazy-route pattern.
2. Identify the existing nav component and its role-gating API.
3. Confirm AccountingShell.tsx outlet and sub-nav.

After writing:
1. Run pnpm check.
2. Manually click through Medical routes to confirm they still work.
3. Verify non-permitted roles do not see the Accounting nav entry.
4. List changed files.

Acceptance Criteria:
- All accounting routes resolve under /accounting/*.
- A user without admin/manager/accountant role cannot access /accounting/*.
- Medical routes still work exactly as before.
- pnpm check passes.
```

---

## Task 11 — Build Accounting Dashboard (AccountingHome.tsx)

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 11 section)
- client/src/pages/accounting/AccountingHome.tsx
- client/src/pages/accounting/AccountingShell.tsx

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for a single page.

Task:
Implement ONLY Task 11: Build Accounting Dashboard.
Replace prototype data inside client/src/pages/accounting/AccountingHome.tsx
with live tRPC data from accounting.dashboardSummary. Render four summary
cards (totalReceiptsToday, totalRevenueToday, totalReceiptsThisMonth,
totalRevenueThisMonth) and four quick-link buttons to Daily Revenue,
Service Revenue, Receipts Inquiry, Patients Inquiry. Include loading,
empty, and error states.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes (AccountingHome.tsx only, plus removing the
  prototype data import).
- Use existing ui primitives (Card, Button, Skeleton).
- Use the trpc React Query hook.

Before writing:
1. Inspect how other pages use trpc.*.useQuery in this project.
2. Confirm ui primitive paths.

After writing:
1. Run pnpm check.
2. Start the app; log in as manager; open /accounting.
3. List changed files.
4. Attach (or describe) a screenshot of the rendered dashboard.

Acceptance Criteria:
- Page renders live data for a manager user.
- Error and loading states render correctly.
- No console errors.
- pnpm check passes.
```

---

## Task 12 — Build Daily Revenue Screen (DailyRevenue.tsx)

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 12 section)
- client/src/pages/accounting/DailyRevenue.tsx

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for a single page.

Task:
Implement ONLY Task 12: Build Daily Revenue Screen.
Wire client/src/pages/accounting/DailyRevenue.tsx to accounting.dailyRevenue.
Provide filter inputs for fromDate, toDate, sectionCode (default 15),
doctorCode. Default date range: start of current month → today.
Render a daily rows table with per-day counts, gross, discount, cash, paid,
net; end with a grand totals row. Add a Print button that navigates to
/accounting/print with the payload defined in plan §7.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- URL-sync filters via search params.
- Use existing ui primitives (Input, DatePicker, Select, Table, Button).

Before writing:
1. Inspect a similar filtered-list page in the codebase for pattern.
2. Confirm the print payload shape against plan §7.

After writing:
1. Run pnpm check.
2. Manually test with 2026-04-01 → 2026-04-30 on op2026.
3. List changed files.
4. Confirm the Print button opens PrintPreview correctly (handoff only —
   PrintPreview itself is Task 15).

Acceptance Criteria:
- Totals match the API output for the tested range.
- Filters reshape the query and are reflected in the URL.
- Print button navigates to /accounting/print with a non-empty payload.
- pnpm check passes.
```

---

## Task 13 — Build Service Revenue Report Screen (LasikRevenue.tsx)

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 13 section)
- client/src/pages/accounting/LasikRevenue.tsx

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for a single page.

Task:
Implement ONLY Task 13: Build Service Revenue Report Screen.
Wire client/src/pages/accounting/LasikRevenue.tsx to
accounting.serviceRevenue with grouping Doctor → Service and legacy-matching
totals (row count, gross, paid, discount) per group and grand. Filters:
fromDate, toDate, sectionCode (default 15), doctorCode, serviceCode.
Default grouping expanded; doctor groups collapsible.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Grouping must match legacy اطباء.rtm / TRF_DRSRV1.RTM structure.
- URL-sync filters.
- Print button navigates to /accounting/print.

Before writing:
1. Re-read the grouping spec in specs/legacy-reports.md.
2. Plan the grouping/totals data structure in the component.

After writing:
1. Run pnpm check.
2. Manually verify totals against an expected reference row.
3. List changed files.

Acceptance Criteria:
- Report shape matches specs/legacy-reports.md.
- Per-doctor and per-service subtotals present, plus grand total.
- Print handoff works.
- pnpm check passes.
```

---

## Task 14 — Build Receipts Inquiry Screen (List + Detail)

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 14 section)
- client/src/pages/accounting/LasikReceipts.tsx
- client/src/pages/accounting/ReceiptsInquiry.tsx (or PatientsInquiry.tsx
  if that file holds the inquiry list)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for two connected pages.

Task:
Implement ONLY Task 14: Build Receipts Inquiry Screen.
- List page (ReceiptsInquiry or LasikReceipts) consumes
  accounting.receiptsInquiry with filters: fromDate, toDate, patientCode,
  doctorCode, sectionCode, trNo, trTy.
- Row click navigates to /accounting/receipts/:secCd/:trTy/:trNo which
  calls accounting.receiptDetail and shows the header + PAPAT_SRV line
  items, and a Print button.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Handle empty results and MSSQL-only patient codes (0013, 0699) without
  crash — show "No medical record linked" pill when MySQL has no match.
- No per-row fetches in the table; one query per page.

Before writing:
1. Identify which placeholder holds the inquiry list in the current repo.
2. Confirm the detail route pattern registered in Task 10.

After writing:
1. Run pnpm check.
2. Open a receipt with 0013 or 0699 (if present) to confirm no crash.
3. List changed files.

Acceptance Criteria:
- Inquiry returns expected receipts for a known range.
- Detail page shows header + line items matching legacy single-receipt
  layout.
- No crash on 0013 / 0699.
- pnpm check passes.
```

---

## Task 15 — Build Print Preview (PrintPreview.tsx)

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 15 section)
- client/src/pages/accounting/PrintPreview.tsx

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for the print surface.

Task:
Implement ONLY Task 15: Build Print Preview.
Make /accounting/print render the payload defined in plan §7 (title, meta,
columns, rows, groupBy, totals, footer) in an A4-portrait printable layout.
Add a Print button that triggers window.print(). Include a
PrintPreview.module.css (or equivalent) with @media print rules removing
app chrome, nav, colored banners.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT add any PDF library in Phase 1.
- Black-on-white, readable borders, Arabic titles preserved when provided.

Before writing:
1. Confirm the payload shape matches what Tasks 12–14 and Task 11 hand in.
2. Design the print CSS with a clean grid layout.

After writing:
1. Run pnpm check.
2. Trigger window.print() from each source page (Daily Revenue, Service
   Revenue, Receipts Detail, Patient Account) and confirm layout.
3. List changed files.
4. Attach (or describe) a screenshot of the print preview.

Acceptance Criteria:
- Prints cleanly without site chrome or colored banners.
- Matches OP .rtm layout structurally (header / body / totals / footer).
- All four source pages hand off correctly.
- pnpm check passes.
```

---

## Task 16 — Integration Testing Against Legacy Outputs

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/legacy-reports.md
- /specs/tasks.md (Task 16 section)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for parity testing.

Task:
Implement ONLY Task 16: Integration Testing Against Legacy Outputs.
Create scripts/accounting/parity-check.ts that:
- invokes each accounting endpoint for the reference range (2026-04 on
  op2026),
- loads the legacy OP CSV export from specs/parity/fixtures/,
- diffs totals (±0.01 currency tolerance) and row counts for Receipts
  Inquiry,
- writes specs/parity/<report>-<range>.md with PASS/FAIL and the delta.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT silently adjust SQL to force parity. If a mismatch exists, file a
  scope-change request and STOP.
- Reuse existing MSSQL pool; no new connection config.

Before writing:
1. Collect legacy OP CSV exports for the reference month and place them
   under specs/parity/fixtures/.
2. Design the comparison helpers in the script.

After writing:
1. Run the script.
2. Attach specs/parity/*.md artifacts.
3. List changed files.

Acceptance Criteria:
- Parity artifact per report exists under specs/parity/.
- All totals match within tolerance for the reference range.
- Receipts Inquiry row count is exact.
- Any mismatch triggers a scope-change request instead of a silent fix.
```

---

## Task 17 — Bug Fixing

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/parity/*
- /specs/tasks.md (Task 17 section)
- Reviewer notes for Tasks 09–15

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for bug fixing.

Task:
Implement ONLY Task 17: Bug Fixing.
Address the blocking issues listed in specs/parity/ and the reviewer notes.
For each bug: smallest correct diff + a regression test under
tests/accounting/. Rerun pnpm check and pnpm test at the end.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT change accepted contracts (Task 07) or SQL builders (Task 08)
  without a reviewer-approved scope change.
- Do NOT refactor beyond bug scope.

Before writing:
1. List every bug with a stable ID (BUG-01, BUG-02, …).
2. Plan the minimal diff for each.

After writing:
1. Run pnpm check and pnpm test.
2. List changed files grouped by bug ID.
3. Confirm parity-check still passes.

Acceptance Criteria:
- All blocking bugs resolved with regression tests.
- pnpm check and pnpm test pass.
- No untouchable file modified.
- Parity still passes.
```

---

## Task 18 — Performance Optimization

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/parity/*
- /specs/tasks.md (Task 18 section)

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for performance work.

Task:
Implement ONLY Task 18: Performance Optimization.
Measure each accounting endpoint for a 30-day window on op2026. If over 2s,
apply semantics-preserving rewrites (no new MSSQL indexes, no new tables,
no new DB objects). Produce specs/perf-report.md with before/after timings
and the list of changes. Rerun parity-check and attach the result.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT alter output semantics.
- Do NOT create DB objects.

Before writing:
1. Add a tiny timing helper in mssqlAccounting.ts if needed (debug-only).
2. Plan the rewrites (e.g., reorder WHEREs, narrow SELECT columns,
   replace subqueries with joins — only if semantically identical).

After writing:
1. Rerun pnpm test.
2. Rerun parity-check.ts; attach artifact.
3. Attach specs/perf-report.md.
4. List changed files.

Acceptance Criteria:
- Every endpoint meets NFR-1 (≤2s for 30-day window).
- Parity still passes.
- No DB object creation.
```

---

## Task 19 — Deployment Preparation

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /specs/scope-lock.md
- /specs/tasks.md (Task 19 section)
- ecosystem.config.js
- package.json
- .env.example

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent for release preparation.

Task:
Implement ONLY Task 19: Deployment Preparation.
Confirm pnpm build and pnpm start run clean. Confirm PM2 ecosystem config
needs no changes. Confirm no new env vars are required. Produce
specs/deploy-notes.md documenting: commands run, verification URLs,
rollback (revert feature branch), manual smoke checklist, environment
expectations (none new).

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the Medical module.
- Apply minimal safe changes.
- Do NOT add env vars.
- Do NOT modify ecosystem.config.js unless unavoidable and documented.

Before writing:
1. Run pnpm build and capture output.
2. Run pnpm start and verify key URLs (Medical + Accounting).
3. Identify any env or config drift.

After writing:
1. Attach specs/deploy-notes.md.
2. List changed files (expected: only the new notes file).
3. Confirm manual smoke checklist items.

Acceptance Criteria:
- pnpm build succeeds.
- pnpm start serves the built app.
- specs/deploy-notes.md describes rollback + smoke checks.
- No env/config additions.
```

---

**Document version:** 1.0.0 — aligned with Constitution v1.0.0, Principles
v1.0.0, Spec v1.0.0, Plan v1.0.0, Tasks v1.0.0.
