# Phase 0 — Research: SRV100 Attendance & Fingerprint Module

> Companion to `plan.md`. Resolves every `NEEDS CLARIFICATION` raised during planning. Each entry is structured as **Decision / Rationale / Alternatives**.

---

## R1. Access (`.mdb`) reader strategy

**Decision**: Use **`mdb-reader`** (pure-Node, MIT-licensed, no native bindings) as the primary reader. If it fails to open the production file, fall back to a **`copy-first`** strategy: copy the `.mdb` to a temp path inside the server process and read the copy. The `odbc` package + Access ODBC driver is the documented last-resort fallback, gated behind env `ATTENDANCE_ACCESS_USE_ODBC=true`, and is **not installed by default**.

**Rationale**:
- `mdb-reader` ships as pure JS, so no driver-install on the Windows host is required — matches existing SRV100 deployment story (single-host, minimal ops).
- Tararus often holds the source file with a sharing-mode lock; copy-first sidesteps that without touching Tararus.
- ODBC requires the "Microsoft Access Database Engine" runtime to be installed and bitness-matched to Node, which adds operational risk for a Phase 1 that should be reversible.

**Alternatives considered**:
- `node-jet` — abandoned upstream.
- Pure ODBC via `odbc` — works but adds an OS-level install requirement; kept as fallback.
- Tararus's SQL mode — explicitly out of scope per the user's input ("current production setup uses Access only").

---

## R2. Background scheduler hosting

**Decision**: Add `server/_core/attendanceSyncScheduler.ts` that mirrors the existing `server/_core/mssqlSyncScheduler.ts` pattern (Node `setInterval` driven by env-tunable intervals, `started` guard, runtime-config persisted via `db.getSystemSetting`). It will call `server/services/attendance/syncEngine.ts#runSyncOnce()`.

**Rationale**:
- The repo already has exactly this pattern; introducing a generic job framework would violate Principle VI (minimal diff, no new abstractions).
- Two-tier cadence (Q1 clarification: 2 min business hours / 15 min off-hours) is trivial to implement in a single tick function that consults the wall clock.
- No `server/jobs/` directory is created.

**Alternatives considered**:
- `node-cron` or `bull` — overkill at Phase 1 sizing (one scheduler with one job).
- A separate process — adds deployment surface; not justified by the workload.

---

## R3. Mutual exclusion of concurrent sync runs

**Decision**: Wrap each sync run in a MySQL **named advisory lock** using `SELECT GET_LOCK('attendance_sync', 0)`; if it returns 0, the run exits immediately as a no-op. Release with `SELECT RELEASE_LOCK('attendance_sync')` in a `finally`. Persist run metadata in `attendance_sync_runs` regardless of acquire outcome (so "skipped" attempts are observable).

**Rationale**:
- Single MySQL instance backs the app — advisory lock semantics are reliable.
- Zero-timeout acquire (`0`) means a second runner exits in <1ms with no blocking.
- Survives process crashes (lock auto-releases when the connection drops).

**Alternatives considered**:
- In-process boolean — fails as soon as a second Node process is added (future PM2 cluster).
- Redis lock — adds a dependency SRV100 does not currently use.

---

## R4. Punch direction inference

**Decision**: Treat the source's `direction` field as a **hint, not a constraint**. Store it on `attendance_punches.direction` as `'in' | 'out' | 'unknown'`. The rules engine **does not** rely on direction; it pairs strictly by chronological order within a shift window (first punch → IN, last punch → OUT, intermediates collapsed). Direction is surfaced only in the Raw Logs UI as a column.

**Rationale**:
- Tararus historically stores `unknown` for many rows; building rules on it would create silent drift.
- Chronological pairing matches how every commercial attendance product handles unreliable direction flags.
- Keeping direction visible (not discarded) preserves auditability per the spec.

**Alternatives considered**:
- Trust direction strictly — rejected as fragile.
- Infer direction post-hoc — premature; pairing already solves the business need.

---

## R5. Frontend polling implementation

**Decision**: Use **`@tanstack/react-query` `refetchInterval: 30_000`** on dashboard and live-board queries, set to `false` when the page is hidden via `refetchIntervalInBackground: false`. The existing tRPC integration uses `@trpc/react-query` v11 which surfaces these options directly. A manual "Refresh" button calls the same hook's `refetch()`.

**Rationale**:
- Zero new dependencies (already in `package.json`).
- Pauses polling when tab is backgrounded — keeps load on MySQL bounded.
- Single source of truth for staleness (no parallel `setInterval` to maintain).

**Alternatives considered**:
- Custom `useEffect` + `setInterval` — duplicates what react-query already offers.
- Server-sent events / WebSocket — explicitly deferred per spec clarification Q4 (no WS dependency in Phase 1).

---

## R6. Print / export strategy for Arabic-headed reports

**Decision**: **Browser-native print** via dedicated print CSS in each report page (`@media print`), with the report body laid out RTL when the locale is Arabic. The page wraps the printable region in a `<div dir="rtl" lang="ar">` so headers/labels/totals render correctly with the project's existing Arabic-capable font stack. CSV export is added via a small client-side serializer (no server endpoint) using `Blob` + `URL.createObjectURL`. PDF export is deferred (Phase 2).

**Rationale**:
- Browsers already render Arabic and RTL correctly; no extra library needed.
- Avoids a server-side renderer (puppeteer, wkhtmltopdf) which would add a large dependency and a runtime surface.
- CSV is universally importable into Excel for HR users.

**Alternatives considered**:
- `pdfkit` / `puppeteer` server-side — heavy; PDF is not a Phase 1 requirement.
- `xlsx` for Excel-native export — defer to Phase 2 if HR asks; CSV covers the common case.

---

## R7. Time zones and DST

**Decision**: Store all timestamps in MySQL as **`DATETIME` (no time-zone qualifier)** in **facility-local time** — the same convention Tararus uses in the source. No DST adjustment is performed; the facility is in a single non-DST jurisdiction (per project context: Egypt, fixed UTC+2/+3 per government policy, currently fixed). A future multi-site/multi-TZ requirement is out of scope.

**Rationale**:
- Matches the source format byte-for-byte; sync becomes a straight passthrough.
- Avoids conversion bugs around DST and overnight shifts.
- All display layers operate in the same local time; no per-user offset.

**Alternatives considered**:
- Store as UTC, convert on read — adds complexity for zero current benefit.
- `TIMESTAMP` (auto-converts) — known footgun for legacy data; rejected.

---

## R8. Dedup hashing key

**Decision**: `source_hash = sha1(emp_cd + '|' + isoLocal(punch_at) + '|' + source_row_id)`. Stored in `attendance_punches.source_hash` (CHAR(40)). The DB also enforces `UNIQUE KEY (emp_cd, punch_at, source_row_id)` as a hard backstop. Insertion uses `INSERT IGNORE` to silently skip duplicates without aborting the run.

**Rationale**:
- Composite UNIQUE catches the common case at the engine level.
- `source_hash` makes admin-side comparison (e.g., "is this row present?") trivial without composing three columns each time.
- SHA-1 is fine for collision-resistance at this scale (~730k rows worst case).

**Alternatives considered**:
- Just the UNIQUE constraint — works but loses the convenient lookup key.
- Cryptographic-grade hashing (SHA-256) — unnecessary; doubles storage with no benefit.

---

## R9. Overnight shift work-date anchoring window

**Decision**: For shifts where `crosses_midnight = 1`, the pairing window is `[shift.start on day D, shift.end on D+1 + 4 hours]`. The 4-hour tail accommodates legitimate overstays. The work-date stored on `attendance_daily.work_date` is **D** (the shift's start day), not the calendar date of the punch.

**Rationale**:
- Matches every commercial attendance product's convention.
- Keeps "Daily Attendance for date X" answering the operator's mental question ("show me the night shift that *started* on X").
- 4-hour tail is generous enough to cover real overstays without spilling into the next shift.

**Alternatives considered**:
- Anchor to the punch's calendar date — confuses users on overnight shifts.
- 8-hour tail — too greedy; risks pulling in early-arrivals for the next shift.

---

## R10. Manual punch correction model

**Decision**: A new row in `attendance_punches` with `source = 'manual'`, the corrective `punch_at`, a `note` column, and `inserted_by` (user id). The **original raw row is never modified or deleted**. The rules engine treats `source='manual'` rows identically to source rows in pairing; downstream reports can filter by source for audit.

**Rationale**:
- Preserves the immutability requirement (`FR-015`, `FR-017`).
- Keeps the data model uniform — pairing logic doesn't branch on source.
- Audit query is `SELECT * FROM attendance_punches WHERE source='manual' AND emp_cd=...`.

**Alternatives considered**:
- Separate `attendance_corrections` table — duplicates schema and forces every reader to UNION; rejected.
- Soft-delete + insert — violates immutability of raw mirror.

---

## R11. Idempotency of `attendance.recomputeRange`

**Decision**: The recompute mutation is fully idempotent: it computes `attendance_daily` rows for `[from, to]` and `UPSERT`s them. No history is kept per recompute — the latest computation wins, and a `computed_at` timestamp marks freshness. A separate audit log entry records who triggered the recompute and over what range.

**Rationale**:
- Phase 1 sizing makes recompute cheap (~200 employees × N days).
- Versioning would balloon storage for negligible value; recompute is reproducible from raw punches + rule definitions.

**Alternatives considered**:
- Store computation history per recompute — over-engineering at this scale.

---

## R12. Unknown-employee surfacing path

**Decision**: When a punch arrives for an `emp_cd` not present in `attendance_employees`, the sync engine **also UPSERTs** a placeholder employee row with `full_name='UNKNOWN'`, `active=0`, `source_hash=NULL`. The Employees page lists these in a separate "Unknown" tab. The dashboard's "absent" count **excludes** unknown employees (`active=0`).

**Rationale**:
- Preserves referential integrity without breaking sync.
- HR sees the list, can edit `full_name`/`department`, and `active=1` it; subsequent dashboards then count them.
- Excluding from "absent" avoids inflating that number with rows that have never been a real employee.

**Alternatives considered**:
- Drop unknown punches — violates `FR-037`.
- Insert without an employee row — orphan rows; harder to surface in UI.

---

## R13. Sync run lifecycle and "partial" status

**Decision**: A run is `partial` if (and only if) it imported **>0** rows AND at least one row was skipped due to a parse error or quarantine (future-dated, malformed). It is `ok` if imported >0 and skipped 0 (excluding dedup `INSERT IGNORE` skips, which never mark the run partial). It is `failed` if the adapter threw before any rows landed. It is `locked` if `GET_LOCK` returned 0 OR the source file was locked by Tararus.

**Rationale**:
- Distinguishes "we couldn't get in at all" from "we got in but some rows were bad."
- Matches operator language on the Sync Status page.

**Alternatives considered**:
- Treat dedup skips as `partial` — would mark every routine re-run as partial; rejected.

---

## R14. Test strategy

**Decision**:
- **Unit tests (Vitest)** for `rulesEngine.ts` — covers every edge case in the spec's Edge Cases section. Pure functions; no DB or filesystem.
- **Service-layer tests** for `syncEngine.ts` and `dailyMaterializer.ts` against an in-process MySQL via the existing test DB harness used by `pnpm test`.
- **Adapter tests** for `accessDbAdapter.ts` using a small fixture `.mdb` checked into `server/services/attendance/__tests__/fixtures/`.
- **No new e2e harness** in Phase 1; manual smoke per `quickstart.md` is sufficient.
- `pnpm check` is the mandatory gate (Principle VII).

**Rationale**: Matches the existing project's testing style (see `client/src/pages/admin-permissions-ui.test.ts` and `admin-users-actions.test.ts`).

---

## R15. Env vars to introduce

**Decision** — additive entries in `server/_core/env.ts`:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `ATTENDANCE_ENABLED` | bool | `true` | Master switch — disables scheduler + hides router if `false`. |
| `ATTENDANCE_SOURCE` | enum | `access` | Reserved for Phase 3 (`access` \| `tcp`). |
| `ATTENDANCE_ACCESS_PATH` | string | (required if enabled) | Absolute path to the Tararus `.mdb`. |
| `ATTENDANCE_ACCESS_COPY_FIRST` | bool | `true` | Copy `.mdb` to temp before read. |
| `ATTENDANCE_ACCESS_USE_ODBC` | bool | `false` | Use `odbc` instead of `mdb-reader`. |
| `ATTENDANCE_SYNC_BIZ_INTERVAL_MS` | int | `120000` (2 min) | Business-hour cadence. |
| `ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS` | int | `900000` (15 min) | Off-hour cadence. |
| `ATTENDANCE_BIZ_HOURS_START` | int | `7` | Business window start (hour, 0–23, facility-local). |
| `ATTENDANCE_BIZ_HOURS_END` | int | `20` | Business window end. |
| `ATTENDANCE_SAFETY_WINDOW_MIN` | int | `120` | HWM rewind buffer (minutes). |

None are logged. `ATTENDANCE_ACCESS_PATH` is redacted in any error surfaced to the UI.

---

**Phase 0 result**: All unknowns resolved. Proceeding to Phase 1.
