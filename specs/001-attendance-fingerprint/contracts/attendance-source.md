# Contract — `AttendanceSource` Adapter Interface

> The seam that lets Phase 3's `tcpDeviceAdapter` replace or coexist with Phase 1's `accessDbAdapter` without changes to the sync engine, rules engine, processed table, or UI. Lives at `server/services/attendance/sources/AttendanceSource.ts`.

## Interface

```ts
export interface AttendanceSource {
  /** Logical adapter name; stored in attendance_sync_runs.source */
  readonly name: 'access' | 'tcp';

  /** Cheap reachability probe. MUST NOT throw; returns false on any error. */
  isReachable(): Promise<boolean>;

  /** Stream raw punches whose source timestamp is >= sinceLocal.
   *  - sinceLocal is facility-local Date (per research.md R7).
   *  - Implementations MUST yield in roughly ascending punch_at order.
   *  - Implementations MUST NOT throw on a single bad row; instead yield a
   *    { kind: 'quarantine', reason, rowRef } record so the sync engine can count it. */
  fetchPunchesSince(sinceLocal: Date): AsyncIterable<RawPunchOrQuarantine>;

  /** Stream the current employee roster. Used to maintain attendance_employees mirror.
   *  Implementations MAY return [] when the source has no notion of an employee table
   *  (e.g., a raw TCP feed); the sync engine tolerates an empty roster. */
  fetchEmployees(): AsyncIterable<RawEmployee>;

  /** Release any open handles, temp files, sockets. Idempotent. */
  close(): Promise<void>;
}

export type RawPunchOrQuarantine =
  | { kind: 'punch'; row: RawPunch }
  | { kind: 'quarantine'; reason: string; rowRef: string };

export interface RawPunch {
  empCd: string;
  punchAt: Date;                          // facility-local; engine validates not >24h in future
  direction?: 'in' | 'out' | 'unknown';   // hint only (R4)
  deviceId?: string;
  sourceRowId: string;                    // stable per-row identity in the source
}

export interface RawEmployee {
  empCd: string;
  fullName: string;
  department?: string;
}
```

## Adapter responsibilities

| Responsibility | accessDbAdapter (Phase 1) | tcpDeviceAdapter (Phase 3) |
|---|---|---|
| Open source | Open `.mdb` via `mdb-reader` (optionally after copy-to-temp). | Open TCP socket to device. |
| Stream punches | Read table rows where `time >= sinceLocal`. | Pull SDK records, optionally subscribe to push events. |
| Stream employees | Read employee table. | Pull device user list. |
| Recover on lock | Retry after copy-first, else surface `isReachable()=false`. | N/A (connection-level). |
| Sanitize timestamps | Reject `punchAt > now + 24h` → quarantine. | Same. |
| Close | Delete temp copy if used. | Close socket. |

## Sync engine guarantees (what the engine does, not the adapter)

The engine — not adapters — owns:

- HWM bookkeeping (`attendance_sync_runs.high_water_mark`).
- Advisory locking (`GET_LOCK('attendance_sync', 0)`).
- Deduplication (`UNIQUE (emp_cd, punch_at, source_row_id)` + `INSERT IGNORE`).
- Unknown-employee placeholder upserts.
- Triggering `dailyMaterializer.recomputeRange(...)` after a successful run.
- Logging the run to `attendance_sync_runs`.

Adapters MUST NOT touch any `attendance_*` table directly. They are pure data sources.

## Factory

```ts
// server/services/attendance/sources/sourceFactory.ts
export function createAttendanceSource(env = process.env): AttendanceSource {
  switch (env.ATTENDANCE_SOURCE ?? 'access') {
    case 'access': return new AccessDbAdapter(/* config from env */);
    case 'tcp':    throw new Error('tcp adapter not implemented in Phase 1');
    default:       throw new Error(`unknown ATTENDANCE_SOURCE: ${env.ATTENDANCE_SOURCE}`);
  }
}
```

## Testability

- Phase 1 ships a fixture `.mdb` under `server/services/attendance/__tests__/fixtures/` so `accessDbAdapter` can be tested without a live Tararus.
- A `FakeAttendanceSource` is used in `syncEngine.test.ts` so the engine's HWM/dedup/quarantine behavior can be exercised independently of any real source.

## Constitution alignment

- Phase 3 swap requires no edits outside this folder (Principle VI — minimal diff).
- No coupling to Medical/Accounting (Principle I).
