# Feature Specification: SRV100 Attendance & Fingerprint Module

**Feature Branch**: `001-attendance-fingerprint`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: SRV100 Attendance & Fingerprint Module — third isolated module beside Medical and Accounting, syncing fingerprint attendance from a Tararus-managed Access (.mdb) source into a dedicated MySQL schema, with dashboards, raw logs, employee views, daily attendance, basic shift/lateness/absence rules, and an adapter seam for future direct-device integration.

> Companion documents: `specs/CONSTITUTION.md`, `specs/PROJECT_PRINCIPLES.md`. This spec adds a **new isolated module**; it does not amend Medical or Accounting.

## Clarifications

### Session 2026-05-19

- Q: What background sync frequency should Phase 1 ship with? → A: Two-tier — every 2 min during business hours (07:00–20:00 local), every 15 min off-hours.
- Q: What UI language should the new Attendance pages use? → A: English for all interactive UI (labels, buttons, toasts, navigation, settings, audit messages); Arabic for printable/exportable reports (header, column labels, totals).
- Q: What expected scale should Phase 1 size for? → A: Small clinic — ≤200 employees, ≤1,000 punches/day, 2 years of history retained (~730k raw punches max). No partitioning required.
- Q: How should the dashboard stay fresh? → A: Polling — dashboard queries refetch on a 30-second interval; manual refresh button also present. No WebSocket dependency in Phase 1.
- Q: What is the default Attendance access for the `accountant` role? → A: Off by default. Accountants receive no Attendance access unless an admin individually grants `attendance.view`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — HR/Admin sees today's attendance at a glance (Priority: P1)

An HR manager opens SRV100, navigates to a new top-level **Attendance** area, and on the home dashboard immediately sees: how many staff are present today, how many are absent, how many arrived late, who is currently inside the facility, who has a missing checkout from yesterday, and whether the last sync from the fingerprint source succeeded. They can drill from any card into a list view.

**Why this priority**: This is the smallest end-to-end slice that proves the whole pipeline works — device → Tararus → Access → sync → MySQL → dashboard. Without it, no other story is credible.

**Independent Test**: With a representative sample Access file in place and the sync engine run once, an authorized user loads `/attendance` and sees six populated cards reflecting that data. No other Attendance page is required for this story to deliver value.

**Acceptance Scenarios**:

1. **Given** a sample Access file with one day of punches and the sync has run successfully, **When** an admin opens `/attendance`, **Then** all six dashboard cards (present today, absent today, late today, inside now, missing checkout, last sync status) render with non-error values.
2. **Given** the sync has never run, **When** an admin opens `/attendance`, **Then** the dashboard renders with zero counts and the sync status card clearly says "Never synced" without throwing an error.
3. **Given** the Access file is locked by Tararus during a sync attempt, **When** the user re-opens the dashboard later, **Then** the sync status card shows a "locked" state with the timestamp of the last attempt and the dashboard does not crash.

---

### User Story 2 — Admin manually triggers a sync and inspects raw punches (Priority: P1)

An admin clicks "Sync now" on the sync status page. A run starts, completes, and the run is listed with counts (seen / inserted / skipped) and outcome (ok / partial / failed / locked). The admin then opens the Raw Logs page, filters by date and employee code, and verifies the new punches appear.

**Why this priority**: Operators need an immediate, auditable way to force a sync and confirm what landed in MySQL. Without it, every sync issue requires developer involvement.

**Independent Test**: With the dashboard already in place, the operator triggers a manual sync and observes a new row in the sync runs list and matching rows in the raw logs view filtered to the test date.

**Acceptance Scenarios**:

1. **Given** the Access file is reachable and the user has admin or manager role, **When** they click "Sync now", **Then** a sync run is recorded with status `ok` and `rows_inserted` matches the number of new punches in the source.
2. **Given** a sync has just imported 50 punches for employee `E001`, **When** the admin filters Raw Logs by `E001` for that day, **Then** all 50 punches are listed with their timestamps.
3. **Given** the Access file is unreachable (path wrong, file locked, file missing), **When** the user clicks "Sync now", **Then** the sync run is recorded with status `failed` or `locked` and a redacted error message; the UI shows a non-blocking error toast and the page remains usable.
4. **Given** a sync runs while a background sync is already in progress, **When** the second sync starts, **Then** it exits cleanly without duplicating rows.

---

### User Story 3 — Daily attendance view with processed results (Priority: P2)

A manager opens the Daily Attendance page for a chosen date, picks a department filter, and sees one row per employee with first-in, last-out, worked minutes, late minutes, early-leave minutes, overtime minutes, and a status (present / absent / leave / holiday / partial / missing checkout). Overnight shifts are anchored to the shift's start date, not the calendar date of the punch.

**Why this priority**: This is the first report that converts raw punches into business-meaningful output and is the basis of every downstream report. Lower than P1 because it depends on the sync pipeline being in place first.

**Independent Test**: With raw punches synced and a basic shift defined, the manager opens `/attendance/daily?date=YYYY-MM-DD` and sees a populated table whose totals match a hand calculation done from the same raw punches.

**Acceptance Scenarios**:

1. **Given** an employee has a single in/out pair within their assigned shift window, **When** the manager opens Daily Attendance for that date, **Then** the row shows correct first-in, last-out, worked minutes, and status `present`.
2. **Given** an employee has only an "in" punch and no "out" for the day, **When** the day's processed row is rendered, **Then** the status shows `missing_checkout`, `last_out` is blank, and `worked_minutes` is blank or zero — not negative.
3. **Given** an employee's shift crosses midnight (e.g., 22:00–06:00), **When** they punch in at 21:55 on day D and out at 06:05 on day D+1, **Then** both punches are attributed to work_date = D and computed correctly.
4. **Given** an employee has no punches and no leave and the day is a working day, **When** the page renders, **Then** the row shows status `absent`.
5. **Given** the daily processed table is rebuilt after a sync correction, **When** the user reloads the page, **Then** values reflect the corrected source without manual intervention.

---

### User Story 4 — Employees list with unknown-employee surfacing (Priority: P2)

An HR user opens the Employees page and sees two groupings: mapped employees (those imported from the Access source) and **unknown** employees — codes that appeared in punches but have no employee record. They can open an employee's detail page to see profile fields and their attendance history.

**Why this priority**: A fingerprint device routinely produces punches for codes that aren't yet mapped to a person. Surfacing them is essential for HR data hygiene; without it, dashboards under-count silently.

**Independent Test**: Insert a punch with a code that does not exist in the employees mirror and verify (a) the sync still completes successfully, (b) the unknown code appears in the Unknown panel, (c) the dashboard counts do not crash.

**Acceptance Scenarios**:

1. **Given** a punch arrives for employee code `E999` not present in the employees mirror, **When** the next sync completes, **Then** the sync run shows status `ok`, `E999` appears in the Unknown employees panel, and no exception is logged.
2. **Given** a mapped employee, **When** the user opens `/attendance/employees/:empCd`, **Then** profile fields and the most recent days of attendance are visible.

---

### User Story 5 — Late, absence, and overtime reports (Priority: P3)

A manager opens the Reports area and runs the Late, Absence, and Overtime reports for a chosen date range and department. Each report renders a printable/exportable table sourced from the processed daily attendance table, not raw punches.

**Why this priority**: Reports are the long-term value of the module but depend on Stories 1–3 being correct first.

**Independent Test**: With at least a week of processed daily attendance present, running each report for that range returns rows whose totals reconcile with the Daily Attendance page.

**Acceptance Scenarios**:

1. **Given** a date range with mixed lateness, **When** the Late report is run with threshold ≥ 1 minute, **Then** only employees who exceeded the threshold are listed with summed late minutes.
2. **Given** the same date range, **When** the report is printed via the browser, **Then** the layout shows header, body rows, and totals in a print-ready form.
3. **Given** a manager without the report-export permission, **When** they open the Reports area, **Then** access is denied with a clear message and no data is loaded.

---

### User Story 6 — Settings: shifts, assignments, leaves, holidays (Priority: P3)

A manager defines a basic shift (start time, end time, optional overnight flag, grace minutes, break minutes), assigns one or more employees to it for an effective date range, records leaves, and marks public holidays. Manual punch corrections, when added, are stored as new audit-logged entries and never overwrite raw punches.

**Why this priority**: Required for accurate rule calculations beyond a single global default, but not blocking for the MVP dashboard.

**Independent Test**: Define a shift, assign an employee, recompute the affected range, and verify late/overtime values change accordingly.

**Acceptance Scenarios**:

1. **Given** a manager defines a shift and assigns it to an employee with `effective_from` today, **When** they trigger a recompute for the affected range, **Then** the processed daily rows for that employee from today onward use the new shift parameters.
2. **Given** a holiday is added on a date that had `absent` rows, **When** recompute runs, **Then** those rows transition to `holiday` status.
3. **Given** a manual punch correction is added, **When** the underlying raw punches table is inspected, **Then** the original rows are unchanged and the correction is stored as a separate `source='manual'` audit entry.

---

### Edge Cases

- **Duplicate punches**: The same source row imported twice (manual sync, re-run, overlap window) must not produce duplicate rows in the local punches table. Sub-30-second duplicates of the same direction collapse during pairing.
- **Missing checkout**: An "in" punch with no matching "out" yields `status='missing_checkout'`, blank `last_out`, and is surfaced on the dashboard.
- **Overnight shifts**: Shifts crossing midnight anchor to the shift's start date; pairing window extends past midnight by a bounded amount.
- **Access locked by Tararus**: Sync run is marked `locked`, no rows are imported, dashboard remains operational, sync health card shows the state.
- **Unknown employee code**: Punch is still recorded; unknown code is surfaced in an admin panel; no crash, no silent drop.
- **Device offline / source unreachable**: Sync run marked `failed` or `partial`; high-water mark does not advance; dashboard last-sync card reflects the error.
- **Future-dated punches (clock drift)**: Punches more than 24 hours in the future are quarantined (not imported) and logged on the sync run.
- **Corrupt source rows**: A single corrupt row does not abort the run; it is counted under `rows_skipped` with a redacted reason; run completes with status `partial`.
- **Employee code changed**: The previous code becomes "inactive" in the employees mirror; historical punches remain attributed to the original code; HR is responsible for any re-mapping policy decision.
- **Multiple punches close together**: Successive punches of the same direction within 30 seconds collapse into one effective event during pairing; raw rows are preserved untouched.
- **Cross-module isolation breach**: An accidental attempt to use Medical or Accounting data in attendance computations must be visibly forbidden by the module boundary; this is enforced architecturally, not at runtime.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation & access control**

- **FR-001**: System MUST expose Attendance as a separate top-level navigation entry beside Medical and Accounting.
- **FR-002**: All Attendance routes MUST live under `/attendance/*` and MUST be gated through the existing protected-route mechanism.
- **FR-003**: Permissions MUST follow these defaults — admin and manager: full Attendance management (configure shifts/leaves/holidays, trigger sync, recompute, adjust punches); accountant, doctor, nurse, reception: NO Attendance access by default. Accountants may be granted `attendance.view` (read-only across the module) individually by an admin; no other role-default broadening is permitted in Phase 1.
- **FR-004**: System MUST NOT widen access to Medical or Accounting as a side effect of introducing Attendance.

**Source ingestion (Phase 1: Access)**

- **FR-005**: System MUST treat the Tararus Access (`.mdb`) database as a read-only source. No write of any kind back to Access is permitted.
- **FR-006**: System MUST import employees and punch records from the Access source into local `attendance_*` tables.
- **FR-007**: System MUST use an incremental high-water-mark strategy so repeated syncs only pull new or recently changed rows.
- **FR-008**: System MUST deduplicate punches such that re-importing the same source row never creates a second local row.
- **FR-009**: System MUST record every sync attempt (including failures and locked-source attempts) with counts of rows seen, inserted, and skipped, plus a redacted error reason where applicable.
- **FR-010**: System MUST run a two-tier background sync schedule — every 2 minutes during business hours (07:00–20:00 facility-local time) and every 15 minutes outside that window — and MUST prevent overlapping concurrent runs.
- **FR-011**: System MUST provide a manual "Sync now" trigger restricted to admin and manager roles.
- **FR-012**: System MUST NOT block application startup on the Attendance source being reachable.
- **FR-013**: System MUST keep sensitive source-connection details (file paths, credentials) out of logs.

**Storage and processing**

- **FR-014**: All Attendance tables MUST use the prefix `attendance_` and MUST live in the existing MySQL database; no schema redesign of Medical or Accounting tables.
- **FR-015**: Raw punches MUST be treated as an immutable source mirror.
- **FR-016**: Processed daily attendance MUST be rebuildable in full from raw punches and rule definitions, without manual intervention.
- **FR-017**: Manual corrections to attendance MUST be stored as new audit-logged entries and MUST NOT overwrite raw punches.
- **FR-018**: Employee/fingerprint code is the linking key. Attendance MUST NOT depend on patient code or any Accounting data.
- **FR-019**: System MUST NOT introduce any cross-module mutation paths between Attendance, Medical, and Accounting.

**Dashboard & screens**

- **FR-020**: The Attendance home dashboard MUST display: present today, absent today, late today, inside now, missing checkout (yesterday), and last sync status.
- **FR-021**: A Raw Logs page MUST list imported punches with filters for date range and employee code at minimum.
- **FR-022**: An Employees page MUST list mapped employees and separately surface unknown employee codes that appeared in punches but lack a profile.
- **FR-023**: An Employee Detail page MUST show profile fields and recent attendance for a given employee code.
- **FR-024**: A Daily Attendance page MUST render processed attendance for a chosen date, with per-employee rows including first-in, last-out, worked minutes, late minutes, early-leave minutes, overtime minutes, and status.
- **FR-025**: A Sync Status page MUST list recent sync runs, current state, last successful high-water mark, and surface the "Sync now" action for authorized roles.
- **FR-026**: A Settings area MUST allow managing shifts, employee shift assignments, leaves, and holidays at a basic level sufficient for Phase 1.

**Reports**

- **FR-027**: Reports MUST be derived from the processed daily attendance table, never directly from raw punches.
- **FR-028**: Reports MUST be print-friendly and export-ready in a tabular form (header, body, totals). Report headers, column labels, and totals MUST be rendered in Arabic; numeric and date values follow facility-local formatting. The interactive UI surrounding the report (filters, action buttons, toasts) remains in English.
- **FR-028a**: All interactive Attendance UI (navigation, page titles, form labels, buttons, toasts, error messages, audit-log entries, sync status text) MUST be in English. Employee names and department names are rendered as stored in the source.
- **FR-029**: Phase 1 reports MUST include: Late report, Absence report, and Overtime report.

**Rules engine (Phase 1 scope)**

- **FR-030**: System MUST compute, per employee per work date: late minutes, early-leave minutes, overtime minutes, worked minutes, and status.
- **FR-031**: System MUST correctly attribute overnight-shift punches to the shift's start date as the work date.
- **FR-032**: System MUST classify a day with no punches, no leave, and no holiday on a scheduled working day as `absent`.
- **FR-033**: System MUST classify a day with an "in" but no "out" as `missing_checkout` and MUST NOT compute negative worked minutes.
- **FR-034**: System MUST treat manually approved leaves and recorded holidays as overriding the `absent` classification.

**Reliability and resilience**

- **FR-035**: System MUST tolerate duplicate, malformed, locked, and unreachable source states without crashing the application or the UI.
- **FR-036**: System MUST allow operators to recompute processed attendance for a chosen date range without re-importing source data.
- **FR-037**: Unknown employee codes MUST never abort a sync run or break any Attendance page.

**Future-readiness**

- **FR-038**: System MUST isolate source ingestion behind an adapter abstraction so a future direct-device integration can replace or coexist with the Access adapter without changes to the rules engine, the processed table, or any UI.
- **FR-039**: System MUST NOT implement direct TCP fingerprint-device communication in Phase 1.

**Verification**

- **FR-040**: `pnpm check` MUST pass after the Attendance module is added.
- **FR-041**: Existing Medical routes, permissions, and flows MUST behave identically to before the change.
- **FR-042**: Existing Accounting routes, permissions, and flows MUST behave identically to before the change.

### Key Entities

- **Employee (mirror)** — Local representation of a Tararus employee. Key attributes: stable employee code, full name, department, default shift assignment, active flag, source hash. Distinct from any Medical or Accounting "staff" record; correlation, if any, is the user's responsibility outside this module.
- **Raw Punch** — One in/out event for an employee at a moment in time, sourced from the device via Tararus/Access. Immutable mirror of the source; includes direction (in / out / unknown), source identifier, and dedup hash.
- **Sync Run** — One attempt to ingest from the Access source. Has start/end times, counts (seen / inserted / skipped), outcome (`ok` / `partial` / `failed` / `locked`), high-water mark advanced (if any), and a redacted error reason if applicable.
- **Shift** — A named work-time definition: start time, end time, overnight flag, grace-late and grace-early minutes, break minutes, active flag.
- **Shift Assignment** — Links an employee to a shift over an effective date range with a weekday mask.
- **Leave** — An approved or pending absence for an employee over a date range, with a type (annual / sick / unpaid / other).
- **Holiday** — A facility-wide non-working date with an optional paid flag.
- **Processed Daily Attendance** — One row per (employee, work date). Derived from raw punches, shifts, leaves, and holidays. Contains first-in, last-out, worked minutes, late minutes, early-leave minutes, overtime minutes, and status. Rebuildable.
- **Manual Correction** — An audit-logged entry that adjusts attendance for a specific employee/date without modifying raw punches.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized HR user can land on `/attendance` and read today's attendance posture (present / absent / late / inside-now / missing checkout / last-sync state) within 5 seconds of opening the page, at the Phase 1 sizing target (≤200 employees, ≤1,000 punches/day, 2 years of history).
- **SC-002**: After a manual sync over a representative one-month sample of source data, the count of imported raw punches matches the source row count exactly, and re-running the sync produces zero additional rows.
- **SC-003**: A sample dataset reconciles end-to-end: the totals shown on the Daily Attendance page for a chosen date equal a hand calculation from the raw punches for that date across all employees.
- **SC-004**: All six dashboard cards remain readable (no error state, no crash) in every adverse condition exercised: source unreachable, source locked, zero rows synced, unknown employee codes present, future-dated punches present.
- **SC-005**: Medical and Accounting routes and permissions behave identically before and after the Attendance module is added, verified by `pnpm check` and a smoke pass over each module's primary screens.
- **SC-006**: Background sync overlap is impossible: under deliberate concurrent triggers, only one run executes at a time and no duplicate raw rows are produced.
- **SC-007**: Switching from the Access source to a hypothetical alternative source requires no change to the processed daily table, the rules engine, or any UI page — only the adapter implementation changes.
- **SC-008**: An operator can identify the cause of a failed sync from the Sync Status page alone in under 30 seconds, without consulting server logs, for any of the named failure modes (locked, unreachable, parse error).
- **SC-009**: For a representative one-week date range, the Late, Absence, and Overtime reports' totals reconcile to the Daily Attendance page totals for the same range with zero discrepancy.
- **SC-010**: Permissions gate correctly: a user with no Attendance role sees no Attendance entry in navigation and receives an access-denied response on any `/attendance/*` route.

## Assumptions

- The Tararus Access database remains the production source for Phase 1; direct TCP device integration is explicitly deferred.
- The Access file is reachable from the SRV100 host via a file path readable by the server process; a read-only access strategy (copy-then-read, where required) is acceptable.
- Employees in scope are those Tararus already manages. SRV100 does not become the master record for HR data in Phase 1.
- Times stored in Access reflect facility-local time; no multi-timezone handling is needed in Phase 1.
- Shift definitions in Phase 1 are simple (one start, one end, optional overnight flag, basic grace and break minutes); split shifts and rotating patterns are out of scope.
- Processed daily attendance is refreshed in two ways: (a) the materializer recomputes affected dates immediately after each successful sync run, and (b) a nightly job re-materializes the last 7 days as a safety net. "Live" per-punch recompute is not required.
- Dashboard freshness is achieved by polling: dashboard queries refetch every 30 seconds while the page is in the foreground, and a manual refresh button is always available. The Attendance module does NOT subscribe to the existing WebSocket channel in Phase 1; adding WS push is a Phase 3 enhancement.
- Sensitive identifiers and connection strings are sourced from environment configuration and not exposed in logs or to non-admin users.
- The existing `pnpm check` verification step is the minimum quality gate before review.
- Scale ceiling for Phase 1: ≤200 employees, ≤1,000 punches/day, 2 years of retained history (~730k rows in `attendance_punches` worst case). Indexes proposed in the plan are sufficient at this scale; partitioning is explicitly out of scope. Pagination defaults: lists 50/page, raw logs 100/page.
- Legacy parity (matching another system's report row-for-row) is **not** required for Phase 1 of Attendance; this differs from Accounting, where parity is mandated by the Constitution. A reconciliation pass against Tararus's own reports may be added in a later phase.
