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
6. [Concurrency and locking](#concurrency-and-locking)
7. [Time zones and device clock offsets](#time-zones-and-device-clock-offsets) (in progress)
8. [Rules engine and materializer semantics](#rules-engine-and-materializer-semantics) (in progress)
9. [Troubleshooting](#troubleshooting) (in progress)

Sections 7 to 9 are stubs at the moment and are being written into this same file.

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

Two MySQL advisory locks keep concurrent attendance work from interleaving. They are separate
locks on purpose: the pull loop and the materializer are different jobs that run at different
cadences.

| Lock | Defined in | Wait | On timeout |
|---|---|---|---|
| `attendance_daily_materializer` | `materializerMutex.ts` (`MATERIALIZER_LOCK_NAME`) | 120 seconds (`GET_LOCK(?, 120)`) | throws `Attendance materialization is already running` |
| `attendance_sync` | `syncEngine.ts` (`SYNC_LOCK_NAME`, inside `runSyncOnce`) | 5 seconds (`GET_LOCK(?, 5)`) | records a sync run with status `locked` and returns `{ runId, status: "locked" }`; nothing is thrown |

The 120 second materializer wait is deliberate. Long rebuilds (the code comment cites 90-day
ranges) can hold the lock for a while, and user-initiated mutations should queue behind them
rather than fail after a short wait. The sync lock's 5 second wait is the opposite trade: when
another pull is already running there is nothing useful to do, so `runSyncOnce` writes a
`locked` run row (useful in history: it tells you ticks were overlapping) and returns.

### Advisory locks are session-scoped, so the connection must stay checked out

`GET_LOCK` and `RELEASE_LOCK` in MySQL belong to a single connection (session), not to a user
or a code path. The pool in `server/db.ts` has a connection limit of 10 and hands out a
different connection for every query. Acquiring the lock through the ordinary pooled `db`
handle would put the lock on an arbitrary connection, and the later `RELEASE_LOCK` would run on
a different one and silently do nothing: two concurrent runs could each believe they hold "the"
lock. `ATTENDANCE_CODE_REVIEW.md` documents this exact defect as finding A3 from the September
2026 review, before the fix landed.

Both lock sites now do the same thing structurally: check out one dedicated connection with
`getDbConnection()`, `GET_LOCK` on it, do all the work (for the materializer, the work itself
runs in a transaction on a normal pooled connection), `RELEASE_LOCK` on the same dedicated
connection, and only then `connection.release()` it back to the pool. The dedicated connection
must stay checked out for the entire cycle; returning it early would hand a lock-owning session
to an unrelated query.

### Release failure: the two sites differ

- `withMysqlAdvisoryLock` (materializer): if `RELEASE_LOCK` fails, the connection is
  `destroy()`ed instead of released. A pooled connection that still owns the lock would poison
  every later borrower, so the pool loses one connection rather than gain a bad one.
- `runSyncOnce` (sync): release errors are caught and ignored, and the connection is released
  to the pool regardless. If a release ever fails here, the pool receives a session that may
  still own `attendance_sync` until the connection dies. The code marks this `// Ignore release
  errors`. The asymmetry matters when diagnosing a suspicious run of `locked` statuses.

### Ordering: lock, then transaction, then afterCommit

`withMaterializerTransaction(connection, db, work, afterCommit)` runs three steps in order:

1. `GET_LOCK` on the dedicated connection (up to 120 seconds).
2. `db.transaction(work)`: the materialization, or the manual punch insert plus recompute in
   the router case, commits as one transaction.
3. `afterCommit(result)`: runs after the commit but while the advisory lock is still held.

The monthly recompute hook (`options.recomputeMonthly`) is an afterCommit callback, so
`MonthlyComputeService.saveEmployeeMonth` runs per employee and month here: daily rows are
already visible to other readers, and no other materialization can start in between. An error
thrown from an afterCommit callback propagates to the caller but does not roll the transaction
back; the daily rows stay committed.

### The dbOverride escape hatch

`recomputeRange(from, to, scope, dbOverride, options)` takes no lock and opens no nested
transaction when `dbOverride` is supplied: the caller owns the transaction. This is safe only
when the caller already serializes the work. Verified users today: `routers/attendance.ts`
passes its `tx` from `withMaterializerTransaction`, so the manual punch write and its recompute
share one transaction under the lock, and the test suite runs against an isolated transaction.
Anything else should use the default lock path.

### What a timeout looks like, per caller

The literal failure message is `Attendance materialization is already running`. What happens
next depends on the caller:

- Fire-and-forget (the error only reaches the log): `punchReception.service.ts` recomputes the
  punch day for the one employee and attaches `.catch` logging; `server/_core/zktecoAdms.ts`
  recomputes each pushed punch day with `void ... .catch`. The device still receives its `OK`
  response, and the nightly recompute will repair any day the skipped recompute left stale.
- Awaited, error propagates to the admin UI through tRPC: the routers (`attendance.ts` manual
  punches, `attendance-leaves.ts`, `attendance-shifts.ts`, `attendance-sync.ts` rebuilds).
- Awaited, error downgrades the result instead of failing it: `syncEngine.ts` logs the
  materializer error and sets the run status to `partial` (punches are stored; daily rows wait
  for the next trigger). The nightly scheduler catches and logs, then retries hourly.

### Every caller of recomputeRange / withMaterializerTransaction

| Caller | Path | Lock taken | Notes |
|---|---|---|---|
| `runSyncOnce` | `syncEngine.ts` | `attendance_sync` first, then the materializer lock via `recomputeRange` | holds the sync lock while waiting on the materializer lock; on materializer error downgrades to `partial` |
| nightly rebuild | `_core/attendanceSyncScheduler.ts` | materializer via `recomputeRange` (last 7 days, monthly on) | catch-and-log, hourly retry |
| ADMS push | `_core/zktecoAdms.ts` | materializer via `recomputeRange`, fire-and-forget per punch day | scoped to the day, no employee filter |
| live punch event | `punchReception.service.ts` | materializer via `recomputeRange`, fire-and-forget per punch | scoped `{ empCd }` plus the punch day |
| FK pull | `fkDeviceSyncService.ts` | materializer via `recomputeRange` | affected date range or today-only, monthly on |
| ZK 4370 pull | `zk4370Sync.service.ts` | materializer via `recomputeRange` | imported date range, monthly on |
| legacy direct sync | `deviceSyncEngine.ts` | materializer via `recomputeRange` | affected range through today, monthly on |
| manual punch add / delete | `routers/attendance.ts` | `withMaterializerTransaction` | recompute runs inside the same transaction (`dbOverride = tx`); monthly rebuild after, outside the lock |
| leave / permission / shift mutations | `attendance-leaves.ts`, `attendance-shifts.ts` | materializer via `recomputeRange` | scoped `{ empCd }`; most call sites also rebuild the affected months, a few recompute daily only |
| manual sync / rebuild / punch batch | `attendance-sync.ts` | materializer via `recomputeRange` | per-day scoped, today-only, or admin rebuild up to 366 days |

There is no lock-ordering deadlock: every path that holds `attendance_sync` waits afterward on
the materializer lock, and no path that holds the materializer lock ever waits on
`attendance_sync`.

### Range limits

`recomputeRangeInTransaction` validates before doing any work: it throws when `to` is before
`from`, and when the span reaches 366 days. The end date is inclusive and normalized to local
midnight; the code comment explicitly forbids treating tomorrow as an exclusive end, because a
future day would be materialized as absences (review finding A6 was exactly that bug). Punch
loading extends one day past the end, next-day-exclusive, so early-morning data from the day
after the range is at least loaded; where it belongs is decided by the pairing rules (section
8).

### Known limits

- The advisory locks coordinate any number of processes sharing the MySQL server; that is what
  they are for. The in-memory state does not coordinate anything: `queriedDevices` and
  `detectedOffsetByDevice` in `zktecoAdms.ts` and the scheduler's nightly marker live in one
  process. A second server process against the same database would double-queue ADMS commands
  and keep its own offset cache. The single-process assumption is deployment-level, not
  enforced by code.
- The materializer lock name is one global name, not per employee. A scoped recompute (one
  employee, one day) still queues behind a 90-day rebuild. Combined with the 120 second wait,
  the design choice is explicit: wait, do not compute against a table being rebuilt.
- MySQL `GET_LOCK` semantics (5.7+): a session can hold several named locks at once, and every
  lock a session holds is released automatically when the session ends. Because lock ownership
  here lives on a dedicated connection, an abrupt process death releases the locks through
  connection teardown; a lock cannot outlive its connection.

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
