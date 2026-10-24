# Attendance sync: from device punch to monthly payroll

This is the reference for `server/services/attendance` and its ingest paths. It explains how a
physical scan on a fingerprint terminal becomes a row in `attendance_daily` and finally a
monthly summary that payroll deducts from. Every claim here was checked against the code at
the time of writing; where a statement is an interpretation rather than a fact in code, it
says so.

## Audience

Maintainers changing sync behavior, investigating wrong attendance values, or adding a new
device. The module has more than forty files; this document tells you which three or four of
them matter for a given question.

## Contents

1. [Pipeline overview](#pipeline-overview)
2. [Choosing a source](#choosing-a-source)
3. [Scheduler cadence](#scheduler-cadence)
4. [High-water mark and safety window](#high-water-mark-and-safety-window)
5. [File map](#file-map)
6. [Concurrency and locking](#concurrency-and-locking) (in progress)
7. [Time zones and device clock offsets](#time-zones-and-device-clock-offsets) (in progress)
8. [Rules engine and materializer semantics](#rules-engine-and-materializer-semantics) (in progress)
9. [Troubleshooting](#troubleshooting) (in progress)

Sections 6 to 9 are stubs at the moment and are being written into this same file.

## Pipeline overview

All ingest paths converge on one insert-only table, one materializer, and one monthly
aggregator:

```
+---------------- ingest: one row per physical scan ------------------+
|                                                                     |
|  K40 Pro, ADMS HTTP push   -> server/_core/zktecoAdms.ts            |
|                               (POST /iclock/cdata?table=ATTLOG)     |
|                                                                     |
|  K40 Pro, TCP 4370 pull    -> zk4370Sync.service.ts                 |
|                               (zkTcpClient / zkDevicePuller)        |
|                                                                     |
|  FK EF10K, puller exe      -> fkDeviceSyncService.ts                |
|                               (FKAttendLogPuller -> FKOldLogPuller) |
|                                                                     |
|  Access .mdb (Tararus)     -> syncEngine.ts                         |
|                               (sources/accessDbAdapter)             |
|                                                                     |
|  live device events        -> punchReception.service.ts             |
|  manual correction         -> routers/attendance.ts (source=manual) |
|                                                                     |
+-------------------------------+-------------------------------------+
                                |
                                v
                       attendance_punches
        dedup: UNIQUE uq_punch (empCd, punchAt, sourceRowId)
               plus a per-row sourceHash
                                |
                                v
              DailyMaterializer.recomputeRange(from, to)
        loads punches, shifts, assignments, cycles, leaves,
        holidays and permissions, then calls rulesEngine.computeDay
        for each employee x day x shift, and upserts the result
                                |
                                v
                       attendance_daily
             unique key (empCd, workDate, shiftId)
                                |
                                v  only when options.recomputeMonthly
              MonthlyComputeService.saveEmployeeMonth()
                                |
                                v
                   attendance_monthly_report
```

Points the diagram hides:

- `attendance_punches` is insert-only. Nothing updates or deletes a punch; corrections are new
  rows with `source = "manual"` (`punches.service.ts`).
- Dedup is two-layered. The `uq_punch` unique index on `(empCd, punchAt, sourceRowId)` is the
  hard guarantee; `sourceRowId` is `empCd_timestamp` for ADMS and event-driven punches, so the
  same scan seen twice (ADMS push and TCP pull) collides and one copy wins. `sourceHash` is a
  second identity column used by lookup paths and the event listener.
- The materializer is idempotent. Recomputing a range overwrites the daily rows for that range
  and deletes rows that the current rules no longer produce. Safe to run repeatedly; the
  scheduler does exactly that every night.
- Monthly aggregation runs per employee and month after the daily rows commit. It reads
  `attendance_daily` through `aggregateAttendanceDays` (`dailyAggregation.ts`) and writes
  `attendance_monthly_report`.
- `recomputeRange` callers: the sync scheduler (nightly 7-day rebuild), ADMS push handler and
  punch reception (fire-and-forget, scoped to the punch day), the device pull services (FK,
  ZK 4370, legacy `deviceSyncEngine`), the attendance routers (leave approval, shift change,
  manual punch add or delete, manual rebuild), and `syncEngine.ts` after a source pull.
  Section 6 lists them with their lock behavior.

## Choosing a source

There are two unrelated things called "source" in this module, and confusing them wastes time:

- The `AttendanceSource` adapter seam (`sources/`): an interface plus a factory selected by
  `ATTENDANCE_SOURCE`, consumed by `runSyncOnce()` in `syncEngine.ts`.
- The actual ingest paths in production: ADMS push, the ZK 4370 pull, and the FK pull. These
  bypass the seam and write `attendance_punches` directly. The scheduler calls them directly
  too; `runSyncOnce()` currently has no production caller (tests exercise it).

| Path | Model | Who triggers it | Env / config | deviceId | State |
|---|---|---|---|---|---|
| Access .mdb via `AccessDbAdapter` (`ATTENDANCE_SOURCE=access`, the factory default) | pull | `runSyncOnce()`, which today only tests call | `ATTENDANCE_ACCESS_PATH`, `ATTENDANCE_ACCESS_COPY_FIRST`, `ATTENDANCE_ACCESS_USE_ODBC` | none (source-level, stored as `"access"`) | reads Tararus tables `KQ_KQData` / `RS_Emp` through `mdb-reader`, optionally copying the locked `.mdb` first |
| `TcpDeviceAdapter` (`ATTENDANCE_SOURCE=tcp`) | pull | same seam as above | none | none (source-level) | placeholder; its constructor throws "not implemented in Phase 1" |
| ADMS HTTP push, K40 Pro (`server/_core/zktecoAdms.ts`, `/iclock/*`) | push | the device: handshake on `GET /iclock/cdata`, punches on `POST /iclock/cdata?table=ATTLOG`; the server queues one `DATA QUERY ATTLOG` per serial per session | `ZK_ADMS_DEVICE_ALLOWLIST` as `serial@ip` pairs (fail closed, 403 DENY otherwise); device settings row: `enabled` + `zk40Protocol=adms` + `admsEnabled` | device serial (`SN`) | production path for the K40 Pro |
| ZK 4370 TCP pull (`zk4370Sync.service.ts`) | pull | scheduler tick when the K40 settings row has `enabled` + `zk40Protocol=tcp` and an IP is known; manual pull from the attendance sync router | `ZK4370_IP` (or the settings row IP), `ZK4370_PORT` (default 4370), comm key from settings, `ZK_USE_LEGACY_PULLER=true` for the PowerShell/COM fallback | `zk_<ip>` | pure-Node ZK protocol client by default; legacy `zkemkeeper` COM path kept behind the flag |
| FK EF10K pull (`fkDeviceSyncService.ts` + `fkAttendLogPuller.ts`) | pull | scheduler tick only when `ATTENDANCE_FK_AUTOSYNC=true` and `FKOldLogPuller.exe` is found; manual sync from the router | `ATTENDANCE_FK_AUTOSYNC` (default off) | `fk_ef10k` | the EF10K also streams real-time punches, which is why the scheduled pull is opt-in; the device returns its full on-device history, so HWM handling differs (see below) |
| TCP 7005 push listener (`devicePushListener.ts`) | push | nothing at startup; only `scripts/test-device-push.ts` | port defaults to 7005 | none | experimental; its three record formats are guesses and timestamps are not offset-corrected |
| Live device events (`punchReception.service.ts` via `deviceAdapter.service.ts`) | push (event) | `startPunchReception()` at server startup, listening on the default device | device config from settings/env via `getDefaultDevice()` | from the device adapter | writes `source="tcp"` punches and fires a scoped recompute per punch |

Related but not ingest: `accessDbSync.service.ts` is an early Access-DB reader that nothing
imports today; `deviceSyncEngine.ts` is the legacy direct-to-device sync still reachable from
the attendance routers.

## Scheduler cadence

`startAttendanceSyncScheduler()` in `server/_core/attendanceSyncScheduler.ts` is called at
server startup and does nothing when `ATTENDANCE_ENABLED=false` (default true).

- Two-tier polling. During business hours (`ATTENDANCE_BIZ_HOURS_START` to
  `ATTENDANCE_BIZ_HOURS_END`, defaults 8 to 17, local time) it ticks every
  `ATTENDANCE_SYNC_BIZ_INTERVAL_MS` (default 2 minutes). Off hours it ticks every
  `ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS` (default 15 minutes).
- A tick still running does not overlap itself; the next tick is skipped.
- Each tick pulls the FK device (when the opt-in above applies) and the ZK 4370 device (when
  its settings say so). ADMS pushes need no tick; the device drives them.
- Nightly safety-net: on the first tick at or after 02:00 local time each day, it first prunes
  `attendance_sync_runs` older than 90 days (`syncRunRetention.ts`, keeping each device's
  newest checkpoint) and then recomputes the last 7 days with monthly aggregation. After a
  failure it retries at most once per hour instead of every tick. The nightly recompute is not
  an optimization: in normal operation, absence rows for days nobody punched after shift start
  are only written by this pass (no punch means no ingest path fires a recompute for that day;
  a manual rebuild from the router is the exception).
- `startAttendanceNightlyRecompute()` is an exported variant that runs only the nightly
  recompute (no device pulls); nothing calls it at startup today.

## High-water mark and safety window

`runSyncOnce()` (and, per device, the FK and ZK pull services) stores a `highWaterMark` on each
`attendance_sync_runs` row:

- The starting point is the newest `highWaterMark` among `ok` or `partial` runs for that
  source, rewound by `ATTENDANCE_SAFETY_WINDOW_MIN` minutes (default 120). The rewind exists so
  a punch that reached the source late (or drifted across the boundary) is re-read; dedup makes
  re-reading harmless.
- With no previous mark, the first run starts at January 1 of the current year.
- The mark only advances when at least one punch was inserted (`maxPunchAt`); an empty poll
  leaves it alone. `shouldPersistSyncRun` (`syncRunPolicy.ts`) keeps empty successful polls out
  of run history entirely: they are heartbeats, not history. Failures are always recorded.
- The reset helpers bound re-imports: `resetSyncHistory()` clears the mark for
  `source="access"`; `resetFkSyncHistory()` and `resetZkSyncHistory()` pin the FK and `zk_%`
  marks to 2026-01-01 so the next pull starts at the attendance system's baseline rather than
  the device's full memory.

## File map

Paths relative to `server/services/attendance/` unless noted.

Ingest (device or file to `attendance_punches`):

| File | Role |
|---|---|
| `sources/AttendanceSource.ts` | adapter interface: `fetchPunchesSince`, `fetchEmployees`, quarantine record type |
| `sources/sourceFactory.ts` | picks `AccessDbAdapter` or `TcpDeviceAdapter` from `ATTENDANCE_SOURCE` |
| `sources/accessDbAdapter.ts` | reads the Tararus Access database |
| `sources/tcpDeviceAdapter.ts` | seam placeholder, throws on construction |
| `syncEngine.ts` | source pull orchestration: `attendance_sync` lock, HWM, employee mirror, punch insert, sync runs |
| `punchReception.service.ts` | real-time device event listener; insert plus scoped recompute per punch |
| `deviceAdapter.service.ts` | default-device abstraction behind punch reception |
| `fkAttendLogPuller.ts` | wraps `FKOldLogPuller.exe` (32-bit) for the FK EF10K |
| `fkDeviceSyncService.ts` | FK pull orchestration: per-device HWM, batching (500), sync run policy |
| `zk4370Sync.service.ts` | ZK 4370 pull orchestration, deviceId `zk_<ip>` |
| `zkTcpClient.ts` | pure-Node ZK wire protocol client (port 4370) |
| `zk4370Client.ts` | alternate ZK framing implementation |
| `zkDevicePuller.ts` | facade: Node TCP client by default, legacy PS1/COM puller behind `ZK_USE_LEGACY_PULLER` |
| `zk4370LogPuller.ts` | legacy 32-bit PowerShell + `zkemkeeper` COM path |
| `zktecoDevice.ts` | older ZKTeco TCP adapter (port 5005) used by the legacy device sync |
| `deviceSyncEngine.ts` | legacy direct device sync, still reachable from routers |
| `devicePushListener.ts` | experimental raw TCP listener on port 7005; not wired at startup |
| `accessDbSync.service.ts` | early Access reader; no importers today |
| `deviceSettings.service.ts` | per-device settings rows (EF10K id=1, K40 id=2), including the persisted ADMS clock offset |
| `deviceDiagnostics.service.ts` | connection diagnostics |
| `../_core/zktecoAdms.ts` | ADMS HTTP push endpoint (`/iclock/*`): allowlist, handshake, ATTLOG parsing, offset correction |

Sync orchestration, locking and run history:

| File | Role |
|---|---|
| `materializerMutex.ts` | MySQL advisory lock `attendance_daily_materializer` plus `withMaterializerTransaction` |
| `../_core/attendanceSyncScheduler.ts` | two-tier polling, FK/ZK pulls, nightly recompute and pruning |
| `syncRunPolicy.ts` | decides whether a sync run is worth storing |
| `syncRunRetention.ts` | 90-day pruning that preserves each device's newest checkpoint |
| `admsOffsetPolicy.ts` | one-shot guard for ADMS offset auto-detection |
| `auditLog.service.ts` | audit rows for sync runs and admin actions |

Compute (punches to daily and monthly rows):

| File | Role |
|---|---|
| `dailyMaterializer.ts` | `recomputeRange`: load everything, compute, upsert `attendance_daily`, delete stale rows |
| `rulesEngine.ts` | pure computation: shift resolution, punch pairing, day results; no DB access |
| `dateOnly.ts` | local-date to `YYYY-MM-DD` key conversion |
| `monthlyCompute.service.ts` | aggregates daily rows into `attendance_monthly_report` |
| `dailyAggregation.ts` | day-count rollup rules used by the monthly build |

Leave and permissions (inputs to compute):

| File | Role |
|---|---|
| `leaveManagement.service.ts` | leave requests and balances |
| `leaveAccounting.ts` | per-year leave day accounting |
| `leaveDates.ts` | approved leave days intersecting a calendar year |
| `leaveDayExclusions.ts` | predicate for days leave should not count on |
| `permissionAdjustment.service.ts` | re-applies permission effects to daily rows |
| `permissionSettings.service.ts` | toggle for entry permission requests |

Reporting and read paths:

| File | Role |
|---|---|
| `dashboard.service.ts` | dashboard cards from `attendance_daily` |
| `reportScheduler.service.ts` | scheduled report generation and email |
| `cache.service.ts` | in-memory TTL cache |
| `departmentFilter.ts` | Arabic/legacy department value matching |
| `employees.service.ts` | `attendance_employees` mirror maintenance |
| `punches.service.ts` | insert-only punch writes with dedup, range reads |

Callers (outside the service folder): `server/routers/attendance.ts` (manual punches,
`withMaterializerTransaction`), `attendance-leaves.ts`, `attendance-shifts.ts`,
`attendance-sync.ts` (manual syncs, resets, rebuilds), `attendance-reports.ts`, and the
`_attendance/` subrouter.

## Concurrency and locking

Stub: this section will document the two advisory locks (`attendance_daily_materializer` with a
120 second wait, `attendance_sync` with a 5 second wait), why the lock connection must stay
checked out of the pool until `RELEASE_LOCK`, the lock-then-transaction-then-afterCommit
ordering, the `dbOverride` escape hatch, what callers see on timeout, and a table of every
`recomputeRange` caller.

## Time zones and device clock offsets

Stub: this section will document the local-time model (server TZ = facility TZ), the per-device
ADMS clock offset (manual override vs auto-detect vs 0), the dedup identity that uses raw vs
corrected time, DST behavior, and a payroll-impact checklist for punches that land on the wrong
day.

## Rules engine and materializer semantics

Stub: this section will document shift resolution (direct assignment vs cycle), punch
partitioning and pairing (30 second collapse, midpoint split, midnight crossing), permission
application, skip rules, the idempotent upsert with stale-row deletion, and the monthly
recompute.

## Troubleshooting

Stub: a symptom to cause to fix table covering lock timeouts, `locked` sync runs, punches hours
off, duplicates after offset changes, missing night-shift checkouts, absent ADMS punches, and
stale daily rows after a shift change.
