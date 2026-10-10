# Attendance Module — Full Code Review

Date: 2026-09-27
Scope: `server/routers/attendance*.ts`, `server/services/attendance/**`, `server/_core/attendanceSyncScheduler.ts`, `drizzle/schema.ts` (attendance tables), `client/src/features/attendance/**` (scan-level).

---

## A. Critical (data corruption / security)

### A1. SQL injection in `updateLeave`
`server/routers/attendance-leaves.ts:275-276`
```ts
dateFrom: sql.raw(`'${input.dateFrom}'`) as any,
dateTo:   sql.raw(`'${input.dateTo}'`) as any,
```
`input.dateFrom/dateTo` are `z.string()` with **no regex validation** (unlike `createPermission` which uses `/^\d{4}-\d{2}-\d{2}$/`). Raw interpolation into SQL → injectable by any user with attendance-write permission. Fix: pass the string as a bound value (`input.dateFrom as any` like everywhere else) and add the date regex to the schema.

### A2. Command injection path into `execSync`
`server/routers/attendance-sync.ts:552-562` (`syncEmployeesFromDevice`)
```ts
const ip = input.ip || settings.ip || "41.199.252.107";
const cmd = `"${pullerPath}" --ip ${ip} --port ${port} --out "${tempFile}"`;
execSync(cmd, ...);
```
`input.ip` is regex-validated, but the fallback `settings.ip` comes from `updateDeviceSettings` (`attendance-sync.ts:120`) where `ip: z.string()` is **unvalidated**. A user with device-settings write access can store `1.2.3.4 & malicious` and get it executed on the next employee sync. Fix: validate `ip` in `updateDeviceSettings` with the same IP regex, and/or validate again before `execSync`. Same pattern in `accessDbSync.service.ts:110,169` and `fkAttendLogPuller.ts:77,177` — audit those inputs too.

### A3. MySQL advisory lock is ineffective (pool with 10 connections)
`server/services/attendance/syncEngine.ts:57-67`, pool at `server/db.ts:460-462` (`connectionLimit: 10`).
`GET_LOCK` / `RELEASE_LOCK` are per-connection. Each `db.execute()` checks out an arbitrary pooled connection, so the lock may be acquired on conn A, "released" on conn B (no-op), and two concurrent syncs can hold "the lock" on different connections simultaneously. Also the pre-emptive `RELEASE_LOCK` before `GET_LOCK` (line 57) is meaningless across connections. Fix: use `db.transaction()` / a dedicated single connection (`pool.getConnection()`) for the whole lock-hold-work-release cycle, or replace with a DB-row mutex (`UPDATE sync_lock SET holder=... WHERE holder IS NULL`).

### A4. Punch dedup is inconsistent across 4 ingestion paths → duplicate punches
Unique index is `uq_punch(empCd, punchAt, sourceRowId)` (`drizzle/schema.ts:1651`); `sourceHash` is **not** unique, and MySQL treats `NULL` in a unique index as distinct.

| Path | sourceRowId | Hash formula |
|---|---|---|
| `PunchesService.insertPunchIgnore` (Access sync) | source row id | `empCd|ISO|sourceRowId` |
| `zk4370Sync.service.ts:134` / `fkDeviceSyncService.ts:125` | `enrollNo_timestamp` | own formula |
| `punchReception.service.ts:70` (live TCP) | **null** | `empNo|getTime()|direction` |
| `batchAddPunches` (`attendance-sync.ts:335`) | **null** | `empCd|getTime()|direction` |

Consequences:
- A punch received live via TCP (`sourceRowId=null`) and later pulled from the device by `zk4370Sync` (`sourceRowId=enrollNo_ts`) does **not** collide in the unique index and the hashes differ → **duplicate rows**.
- `punchReception`/`batchAddPunches` dedup is a check-then-insert with no unique constraint backing → race → duplicates.
- `deviceSyncEngine.ts:119` uses `sourceRowId = empNo` (constant per employee), so two punches by the same employee in the same second silently dedupe into one.
Fix: one canonical `sourceRowId` scheme (e.g. `device_enrollNo_epochMs`) used by every path, and make `sourceHash` (or the tuple) actually unique including a non-null sentinel for live/manual rows.

### A5. Night-shift (crosses-midnight) check-outs never reach the work date
`dailyMaterializer.ts:139-145` fetches punches with `getPunchesByRange(workDate, workDate)` → window `[workDate 00:00, workDate+1 00:00)` (`punches.service.ts:116-120`). A 22:00→06:00 shift's checkout at 06:00 next morning is **never** in the set → every cross-midnight shift day is permanently `missing_checkout`, and the orphan 06:00 punch lands on the next day where it may create a bogus `partial` row. Fix: when the resolved shift `crossesMidnight`, extend the punch window to ~shift end + grace on the next day (and exclude those punches from the next day's own computation).

### A6. `syncNow` materializes **tomorrow** as absent for everyone
`attendance-sync.ts:770-774` calls `recomputeRange(today, tomorrow)`; `recomputeRange` treats `to` inclusively (sets 23:59:59). For tomorrow, shifts resolve but there are no punches → `computeDay` writes `absent` rows for every employee for a future date. Every manual sync (business-hours cron calls `FKDeviceSyncService.syncNow`, not this — but the manual button does) pollutes tomorrow. Fix: `recomputeRange(today, today)`.

---

## B. Bugs (wrong results)

### B1. `rawPunches` total count is garbage
`server/routers/attendance.ts:253-268` — `select({ count: attendancePunches.id })` selects the **id column**, not a count; `total[0]?.count` returns the first row's id. Also when no filters are given, `total` is hardcoded `0`. Fix: `select({ count: sql<number>\`count(*)\` })` (or drizzle `count()`), and always run the count query.

### B2. Shift-cycle slot index off-by-one / ignores slot count
`rulesEngine.ts:541-551` — `calcCycleSlotIndex` ignores `totalSlots`; `day`/`week` returns `getDay()` (0–6) so cycles with ≠7 slots never match (slot lookup fails → no shift → day silently absent); `month` returns `getDate()` (1–31) so slot 0 is never used and the 31st maps to a non-existent slot 31. Anchor date is loaded but unused. Fix: `idx = daysBetween(anchor, date) mod totalSlots` (and define `week` as weeks-since-anchor mod slots).

### B3. Timezone off-by-one on date filters (server)
`attendance.ts:201-208` (`rawPunches`), `dailyByEmployee` (`:621-623`), `recomputeDaily` (`attendance-leaves.ts:359-360`): `new Date("YYYY-MM-DD")` parses as **UTC midnight**, then is compared to local-midnight-anchored `punchAt`/`workDate`. In UTC+2/+3 the range starts 2–3 hours late → early-morning punches on the first day are dropped. Elsewhere (`monthlyPunches`) the code deliberately uses `T00:00:00Z` — the two endpoints disagree about what a "day" is. Fix: one helper `parseLocalDate(ymd)` used everywhere.

### B4. Timezone off-by-one on "today" (client)
~10 files use `new Date().toISOString().split("T")[0]` (UTC) for "today": `DailyView.tsx:47`, `EmployeeDetail.tsx:24`, `LeaveManagement.tsx:13`, `MyAttendanceProfile.tsx:18`, `PermissionReport.tsx:10`, `Reports.tsx:19`, `EmployeesList.tsx:290,440,490`, `AttendanceHome.tsx:91-92`, `admin/SyncStatus.tsx:68`. Between 00:00–02:00/03:00 local, users see/report on **yesterday**. Fix: local-ymd helper (mirror of server `ymd()`).

### B5. `dailyByDate` permission matching likely broken in range mode
`attendance.ts:517` — key is `String(permission.date).slice(0,10)`. If the driver returns a `Date` object (as it does for `attendanceDaily.workDate`, which is treated as a `Date` at `:529`), `String(date)` yields `"Sat Sep 27 2026 ..."` → slice → `"Sat Sep 27"` → never matches → entry/exit permission minutes silently 0 in range mode. Fix: use the same `ymd()` normalizer for both sides.

### B6. `summaryReport` references a field that never exists
`monthlyCompute.service.ts:182` — `departId: m.departId`; `enrichMonthly` sets `department`, never `departId` → always `undefined`.

### B7. Leave spanning a year boundary vanishes from balances
`attendance.ts:718-720` and `attendance-leaves.ts:458-459` require `dateFrom >= Y-01-01 AND dateTo <= Y-12-31` — a leave Dec 28→Jan 3 is excluded from **both** years' used-day counts. Fix: overlap predicate (`dateFrom <= yEnd AND dateTo >= yStart`) and clamp day counts to the year.

### B8. `createPermission` doesn't recompute; `deleteLeave` doesn't recompute
- `attendance-leaves.ts:514-569`: permission inserted with `approved: true` but no `recomputeRange` → late/early minutes stay until an unrelated trigger recomputes (inconsistent with `approvePermission`, which recomputes daily + monthly).
- `attendance-leaves.ts:220-230`: deleting a leave leaves `attendance_daily.status='leave'` rows behind until the nightly recompute.
Fix: recompute after both mutations.

### B9. `batchAddPunches` doesn't recompute daily
`attendance-sync.ts:314-378` inserts manual punches but never triggers the materializer → the new punches don't affect `attendance_daily` until the next sync tick.

### B10. `punchReception.stopListening()` leaks listeners
`punchReception.service.ts:26-38` — `startListening` does `device.on("punch", ...)` but `stopListening` only flips a flag; a start→stop→start cycle double-registers → duplicate handling of every punch (double recompute, double broadcast; insert itself is hash-deduped). Fix: keep the handler reference and `device.off(...)`.

### B11. `dayStatus` aggregation hides absence when mixed with leave
`dailyAggregation.ts:29-39` — a day with one `absent` shift and one `leave` shift reports `leave`; `absentShiftCount` exists but the headline status masks the absence from monthly `absentDays`. Decide the business rule; if absence should win over leave, reorder.

### B12. Punches from an unmapped device are silently dropped
`rulesEngine.ts:625` — `if (punchDeviceId && deviceCandidates.length === 0) continue;` A punch from a real device that no shift allows disappears from every shift's computation (no quarantine, no surfacing). At minimum log/collect these for the raw-logs review flow.

### B13. `bootstrapShifts` assigns weekdayMask 127 (7 days)
`attendance-sync.ts:1168` — all employees assigned Sun–Sat; rest days must then be fixed one by one. Default should match the business week (the shifts router itself defaults to 62 = Sun–Thu at `attendance-shifts.ts:836`).

### B14. `otReport` hardcodes an 8-hour day
`monthlyCompute.service.ts:171` — `otDays = ceil(totalOTMins/60/8)`; shifts have real durations.

---

## C. Performance / query problems

1. **Materializer N+1**: `dailyMaterializer.recomputeRange` runs one `getPunchesByRange` query **per employee per day** (`dailyMaterializer.ts:139`). 100 employees × 31 days ≈ 3,100 queries per recompute; the post-sync recompute (`syncEngine.ts:176-185`) can span from the safety-window rewind to "now" (potentially months). Load punches once for the whole range grouped by empCd+day.
2. **Post-sync recompute window unbounded**: `syncEngine.ts:178-184` recomputes from `sinceLocal` (HWM − 2h, or Jan 1 on first run) to now on every sync with any new punch. Restrict to the days actually touched by inserted punches.
3. **`enrichMonthly` N+1** (`monthlyCompute.service.ts:103-109`): one employee query per row; join once instead.
4. **`saveMonthlyReports` re-queries and re-aggregates per employee** (`monthlyCompute.service.ts:210-237`) duplicating what `buildMonthly` already computed.
5. **Materializer writes are not transactional**: per-day upsert + `notInArray` delete interleaved; a crash mid-range leaves a half-recomputed month, and concurrent recompute (manual punch + scheduler + sync) can interleave deletes/upserts for the same day. Wrap per-(emp,day) units in transactions and add a recompute mutex.
6. **`liveBoard`/status endpoints** (`admsStatus`, `fkStatus`, `deviceStatus`) do `count()` over all of `attendance_punches` each poll — fine now, will degrade; cache or use the sync-runs table.
7. **Nightly recompute marker is in-memory** (`attendanceSyncScheduler.ts:27`): a restart after 02:00 re-runs the 7-day recompute on the first tick — harmless but wasteful; persist or compute from `attendance_daily.computedAt`.

---

## D. Code quality / hygiene

- All five router files share an identical copy-pasted import header; most of it is unused in each file (`crypto`, `execSync`, `fs`, `path`, `os`, `getDeviceDiagnostics`, `FKAttendLogPuller`, `ZKTecoDevice`, `isNull`, `max`, `count`, `getAllUsers`, …). This is how A2's `execSync` ended up imported in `attendance.ts` which never uses it. Run `pnpm check`/eslint no-unused-vars and split the headers.
- Hardcoded production values: device IP `41.199.252.107` (`attendance-sync.ts:552`), puller path `E:\selrs.cc\scripts\FKUserPuller.exe` (`:557`), Arabic department literal `"المركز والعيادة"` repeated in 6 places as a magic "include both branches" filter — extract to a constant with a comment explaining the business rule.
- `systemHealth` returns `totalEmployees: 0` with a "Would query from DB" comment (`attendance.ts:670`) — stub shipped to prod.
- `resetSyncHistory` message says "last 2 years" but the engine rewinds to Jan 1 of the current year (`syncEngine.ts:97`, comment "(2026 only)") — message and behavior disagree, and the behavior silently changes every January.
- Inconsistent self-links: notifications point to `/attendance/me` in some places and `/attendance/my` in others (`attendance-leaves.ts:211,562` vs `attendance.ts:683`).
- `employees.service.ts` writes a `sourceHash` on employees that is never read.
- `permissionSettings.service.ts` is 20 lines wrapping a setting — fine, but `getEntryPermissionRequestsEnabled` is a `protectedProcedure` while the setter is attendance-write — confirm the page-level guard is intended for all staff.
- Tests exist (`server/tests/attendance.test.ts`, `client/src/attendance-*.test.ts`) but nothing covers: cross-midnight shifts, cycle slot math (B2), dedup across ingestion paths (A4), or the rawPunches count (B1). Those four are exactly where the worst bugs are.

---

## Priority fix order

1. A1 (SQL injection), A2 (command injection) — security, same-day.
2. A4 + B9/B10 (dedup + listener leak) — stops silent punch duplication.
3. A5 (night shifts) + A6 (tomorrow-absent) — wrong payroll-facing data every day.
4. A3 (lock) — wrap sync in one connection/transaction.
5. B1, B2, B3/B4/B5 (counts, cycle math, timezone helpers).
6. C1/C2 (materializer N+1 and recompute window) before data grows.
