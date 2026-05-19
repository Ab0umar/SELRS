# Contract — tRPC `attendanceRouter`

> Lives at `server/routers/attendance.ts`, registered in `server/routers/index.ts` as `attendance`. Every procedure is `protectedProcedure` wrapped by one of the role-gated factories. Input shapes are Zod schemas; output shapes are TypeScript types serialized via tRPC's superjson.

## Role-gated procedure factories (additive in `server/_core/procedures.ts`)

```ts
// All three build on top of the existing protectedProcedure.
attendanceViewerProcedure  // requires perm: 'attendance.view'
attendanceManagerProcedure // requires perm: 'attendance.manage'  (admin & manager roles)
attendanceAdminProcedure   // requires perm: 'attendance.admin'   (admin only)
```

Permission keys are registered in the existing path-based permission mapping. Admin bypass and branch restrictions follow current semantics.

---

## Queries

### `attendance.dashboardSummary`

**Role**: `viewer`
**Input**: `{}`
**Output**:
```ts
{
  presentToday: number;
  absentToday: number;
  lateToday: number;
  insideNow: number;
  missingCheckoutYesterday: number;
  lastSync: {
    status: 'never' | 'ok' | 'partial' | 'failed' | 'locked' | 'running';
    finishedAt: string | null;     // ISO local
    rowsInserted: number;
    highWaterMark: string | null;  // ISO local
    error: string | null;
  };
  asOf: string;                    // ISO local
}
```
**Source**: `attendance_daily` (for the five counts) + latest row from `attendance_sync_runs`.
**Idempotency**: Pure read.

---

### `attendance.syncStatus`

**Role**: `viewer`
**Input**: `{ limit?: number /* default 50, max 200 */ }`
**Output**: `{ runs: SyncRunRow[]; current: SyncRunRow | null }`
where `SyncRunRow` mirrors `attendance_sync_runs` columns (with sanitized `error`).

---

### `attendance.employeesList`

**Role**: `viewer`
**Input**: `{ search?: string; department?: string; activeOnly?: boolean; unknownOnly?: boolean; page?: number; pageSize?: number /* default 50, max 200 */ }`
**Output**: `{ rows: EmployeeRow[]; total: number }`
**Notes**: `unknownOnly=true` returns rows where `active=0 AND full_name='UNKNOWN'`.

---

### `attendance.employeeDetail`

**Role**: `viewer`
**Input**: `{ empCd: string }`
**Output**: `{ employee: EmployeeRow; recentDaily: DailyRow[10]; assignments: ShiftAssignment[]; leaves: LeaveRow[] }`

---

### `attendance.rawPunches`

**Role**: `viewer`
**Input**:
```ts
{
  empCd?: string;
  from: string;  // ISO date
  to: string;    // ISO date, inclusive
  source?: 'access' | 'tcp' | 'manual' | 'all';
  page?: number;
  pageSize?: number; // default 100, max 500
}
```
**Output**: `{ rows: PunchRow[]; total: number }`
**Notes**: Date filter is on `punch_at`. Backed by `idx_emp_time` or `idx_punch_at`.

---

### `attendance.dailyByDate`

**Role**: `viewer`
**Input**: `{ date: string /* ISO date */; department?: string; page?: number; pageSize?: number }`
**Output**: `{ rows: DailyRow[]; total: number }`

---

### `attendance.dailyByEmployee`

**Role**: `viewer`
**Input**: `{ empCd: string; from: string; to: string }`
**Output**: `{ rows: DailyRow[] }`

---

### `attendance.insideNow`

**Role**: `viewer`
**Input**: `{}`
**Output**: `{ rows: { empCd: string; fullName: string; department: string|null; firstIn: string }[] }`
**Source**: `attendance_daily WHERE work_date = today AND inside_now = 1`.

---

### `attendance.lateReport`

**Role**: `viewer`
**Input**: `{ from: string; to: string; department?: string; thresholdMinutes?: number /* default 1 */ }`
**Output**: `{ rows: { empCd: string; fullName: string; lateDays: number; totalLateMinutes: number }[]; totals: { lateDays: number; totalLateMinutes: number } }`
**Notes**: Sourced from `attendance_daily`, never raw punches (FR-027).

---

### `attendance.absenceReport`

**Role**: `viewer`
**Input**: `{ from: string; to: string; department?: string }`
**Output**: `{ rows: { empCd: string; fullName: string; absentDays: number }[]; totals: { absentDays: number } }`

---

### `attendance.overtimeReport`

**Role**: `viewer`
**Input**: `{ from: string; to: string; department?: string }`
**Output**: `{ rows: { empCd: string; fullName: string; overtimeMinutes: number; days: number }[]; totals: { overtimeMinutes: number } }`

---

### `attendance.shifts.list`, `attendance.shifts.get`, `attendance.leaves.list`, `attendance.holidays.list`, `attendance.assignments.listByEmployee`

**Role**: `viewer`
Standard list/get with obvious shapes.

---

## Mutations

### `attendance.syncNow`

**Role**: `manager`
**Input**: `{}`
**Output**: `{ runId: number; status: 'running' | 'locked' }`
**Behavior**: Returns immediately. Spawns the run, which writes to `attendance_sync_runs`. Caller polls `syncStatus` for completion.
**Idempotency**: Calling twice in quick succession returns `status='locked'` on the second call (advisory lock).
**Audit**: Logged via existing audit helper with `action='attendance.syncNow'`.

---

### `attendance.recomputeRange`

**Role**: `manager`
**Input**: `{ from: string /* ISO date */; to: string /* ISO date */; empCd?: string }`
**Output**: `{ rowsWritten: number }`
**Behavior**: Synchronous (Phase 1 sizing makes this <30 s for full ranges). Calls `dailyMaterializer.recomputeRange()`.
**Idempotency**: Yes (R11). UPSERTs only.
**Audit**: `action='attendance.recompute'` with the range.

---

### `attendance.shifts.upsert`

**Role**: `manager`
**Input**: full `Shift` shape with optional `id`.
**Output**: `{ id: number }`
**Side effect**: If a shift parameter changes (`start_time`, `end_time`, `grace_*`, `break_minutes`, `crosses_midnight`), the UI prompts the user to trigger `recomputeRange` for affected dates. The server does **not** auto-recompute on shift edit (predictable cost).

---

### `attendance.shifts.delete`

**Role**: `admin`
**Input**: `{ id: number }`
**Output**: `{ ok: true }`
**Behavior**: Hard delete only if no `attendance_shift_assignments` reference it; otherwise returns error and suggests deactivation (`active=0`).

---

### `attendance.assignments.upsert`, `attendance.assignments.delete`

**Role**: `manager`
Standard upsert/delete on `attendance_shift_assignments`. Validates non-overlapping ranges per employee on insert.

---

### `attendance.leaves.upsert`, `attendance.leaves.delete`

**Role**: `manager`
Standard upsert/delete. `approved` defaults to `false`.

---

### `attendance.holidays.upsert`, `attendance.holidays.delete`

**Role**: `manager`
Standard upsert/delete on `attendance_holidays`.

---

### `attendance.punches.adjust`

**Role**: `admin`
**Input**: `{ empCd: string; punchAt: string; direction: 'in'|'out'|'unknown'; note: string }`
**Output**: `{ id: number /* new punches row id */ }`
**Behavior**: Inserts a NEW row in `attendance_punches` with `source='manual'`, `inserted_by=ctx.user.id`, the provided `note`. Original raw rows are NEVER modified or deleted (FR-017).
**Audit**: `action='attendance.punchAdjust'`.

---

## Common types (frontend-shared via `shared/attendance/types.ts`)

```ts
type EmployeeRow = { empCd: string; fullName: string; department: string|null;
                     defaultShiftId: number|null; active: boolean };

type PunchRow = { id: number; empCd: string; punchAt: string;
                  direction: 'in'|'out'|'unknown'; source: 'access'|'tcp'|'manual';
                  sourceRowId: string|null; note: string|null; importedAt: string };

type DailyRow = { empCd: string; fullName: string; workDate: string;
                  shiftId: number|null; firstIn: string|null; lastOut: string|null;
                  workedMinutes: number|null; lateMinutes: number;
                  earlyLeaveMin: number; overtimeMinutes: number;
                  status: 'present'|'absent'|'leave'|'holiday'|'partial'|'missing_checkout';
                  insideNow: boolean; computedAt: string };
```

## Error contract

All procedures use tRPC's `TRPCError`:
- `UNAUTHORIZED` — no session.
- `FORBIDDEN` — session lacks required permission key.
- `BAD_REQUEST` — Zod validation failure.
- `CONFLICT` — uniqueness/overlap violation (e.g., overlapping assignment).
- `INTERNAL_SERVER_ERROR` — adapter or DB error; `error.message` is sanitized.

## Constitution alignment

- Every procedure is read-only against MSSQL (in fact: no MSSQL access at all from this router) and against Medical tables (no imports). Principle I, III, VII satisfied.
- Mutations only touch `attendance_*` tables. Principle IV satisfied (additive only).
