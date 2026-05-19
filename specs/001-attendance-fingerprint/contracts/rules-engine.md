# Contract — Attendance Rules Engine (Pure Functions)

> Lives at `server/services/attendance/rulesEngine.ts`. Pure: no DB access, no I/O, no `Date.now()` inside business logic (the caller passes `now`). Every function is unit-testable in isolation via Vitest. The materializer is the only thing that calls these functions and writes results to `attendance_daily`.

## Types

```ts
export interface Shift {
  id: number;
  startTime: string;        // 'HH:MM'
  endTime: string;          // 'HH:MM'
  crossesMidnight: boolean;
  graceLateMin: number;
  graceEarlyMin: number;
  breakMinutes: number;
}

export interface ShiftAssignment {
  empCd: string;
  shiftId: number;
  effectiveFrom: string;    // 'YYYY-MM-DD'
  effectiveTo: string | null;
  weekdayMask: number;      // 7-bit; bit 0 = Sunday
}

export interface PunchInput {
  punchAt: Date;            // facility-local
  direction?: 'in' | 'out' | 'unknown';
  source: 'access' | 'tcp' | 'manual';
}

export interface DayContext {
  empCd: string;
  workDate: string;         // 'YYYY-MM-DD'
  punches: PunchInput[];    // already filtered to this work-date's pairing window
  shift: Shift | null;
  leave: { type: 'annual'|'sick'|'unpaid'|'other'; approved: boolean } | null;
  holiday: boolean;
  isScheduledWorkday: boolean;
  now: Date;                // for inside-now calculation; caller supplies
}

export interface DayResult {
  empCd: string;
  workDate: string;
  shiftId: number | null;
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number | null;
  lateMinutes: number;
  earlyLeaveMin: number;
  overtimeMinutes: number;
  status: 'present'|'absent'|'leave'|'holiday'|'partial'|'missing_checkout';
  insideNow: boolean;
}
```

## Functions

### `resolveShift(empCd, date, assignments, defaultShiftId, shiftsById)`

**Returns**: `Shift | null`.

**Pre**:
- `assignments` is the full list of assignments (caller does not pre-filter).
- `date` is `YYYY-MM-DD`.

**Post**:
- Picks the assignment with the latest `effectiveFrom <= date` where (`effectiveTo IS NULL OR effectiveTo >= date`) AND the weekday bit for `date` is set.
- If no assignment matches, falls back to `defaultShiftId` (if any).
- Returns `null` if neither matches.

**Edge cases covered**: mid-day change (handled by `effectiveFrom` precision), weekday mask exclusion, overlapping assignments (latest `effectiveFrom` wins; the assignments service enforces non-overlapping at write time).

---

### `pairPunches(punches)`

**Returns**: `{ firstIn: Date | null; lastOut: Date | null }`.

**Pre**: `punches` sorted ascending by `punchAt`.

**Post**:
- Empty input → `{ null, null }`.
- 1 input → `{ firstIn: p[0], lastOut: null }` (missing checkout).
- 2+ inputs → `{ firstIn: p[0], lastOut: p[last] }`.
- Sub-30-second duplicates of consecutive punches are collapsed (only the first is kept for pairing purposes).
- Direction is **not** consulted (R4).

**Edge cases covered**: duplicate punches; multiple punches close together; same employee on two devices.

---

### `computeDay(ctx: DayContext): DayResult`

**Returns**: a fully-populated `DayResult`.

**Algorithm**:

1. If `ctx.leave?.approved === true` → `status='leave'`, all minute fields 0, `firstIn/lastOut` from punches if any (informational), `insideNow=false`. Return.
2. Else if `ctx.holiday === true`:
   - If no punches → `status='holiday'`, 0s.
   - Else → `status='holiday'`, `worked_minutes` from pairing, `overtime_minutes` = `worked_minutes` (configurable Phase 2 policy flag; Phase 1: treat as OT). `late_minutes=0`, `early_leave_min=0`. `insideNow` per below.
3. Else compute `pairing = pairPunches(ctx.punches)`.
4. If `pairing.firstIn === null`:
   - If `ctx.isScheduledWorkday` → `status='absent'`, all 0s.
   - Else → `status='holiday'` if holiday else nothing scheduled: `status='absent'` is wrong; for non-scheduled days emit `status='present'` with all 0s ONLY if there are no punches — actually use `status='absent'` only on scheduled days. For non-scheduled days with no punches, the row is suppressed (not written to `attendance_daily`).
5. Else if `pairing.lastOut === null` → `status='missing_checkout'`, `workedMinutes=null`, `lateMinutes=clampLate(...)` (still computed), `overtimeMinutes=0`, `earlyLeaveMin=0`, `insideNow` per below.
6. Else (full pair):
   - `workedMinutes = max(0, minutesBetween(firstIn, lastOut) - shift.breakMinutes)` if a break is configured; else `minutesBetween(firstIn, lastOut)`.
   - If `shift` is non-null:
     - `lateMinutes = max(0, minutesBetween(shiftStartOnDate, firstIn) - shift.graceLateMin)`.
     - `earlyLeaveMin = max(0, minutesBetween(lastOut, shiftEndOnDate) - shift.graceEarlyMin)`.
     - `overtimeMinutes = max(0, minutesBetween(shiftEndOnDate, lastOut) - shift.graceEarlyMin)`.
   - Else: all three minute fields are 0 (no shift to compare against).
   - `status='present'`.
7. `insideNow = (firstIn !== null AND lastOut === null AND ctx.now is within today's pairing window for this work_date)`.

**Edge cases covered** (full mapping back to spec Edge Cases):

| Spec edge case | Function behavior |
|---|---|
| Duplicate punches | Sub-30-sec collapse in `pairPunches`; DB UNIQUE prevents duplicates upstream. |
| Missing checkout | Step 5: `status='missing_checkout'`, `workedMinutes=null` (never negative). |
| Overnight shifts | Caller passes punches already filtered to `[shift.start on D, shift.end on D+1 + 4h]`; `computeDay` is unaware of midnight crossings. |
| Access locked / device offline | Engine-level concerns (`syncEngine`), not rules engine. |
| Unknown employee code | Engine-level concern. |
| Future-dated punches | Engine-level quarantine; never reach rules engine. |
| Corrupt source rows | Engine-level quarantine. |
| Employee code changed | Out of scope for rules engine; HR concern. |
| Multiple punches close together | Step 3 collapse. |
| Cross-module isolation | Architecture — rules engine imports nothing outside `server/services/attendance/`. |

---

### `materializeRange(from: Date, to: Date, scope?: { empCd?: string })`

**Lives in**: `dailyMaterializer.ts` (not pure — touches DB).

**Algorithm**:
1. Load shifts, assignments, leaves, holidays once.
2. For each employee in scope (or all `active=1` employees):
   - For each calendar `D` in `[from, to]`:
     - Resolve shift; if shift is overnight, use D-anchor (R9).
     - Determine pairing window:
       - non-overnight: `[D 00:00, D 23:59:59]`.
       - overnight: `[shift.start on D, shift.end on D+1 + 4h]`.
     - Load punches in window (single batched query per employee per range).
     - Build `DayContext` and call `computeDay`.
     - `INSERT ... ON DUPLICATE KEY UPDATE ...` into `attendance_daily`.
3. Return `rowsWritten`.

**Idempotency**: Calling twice produces identical rows.

## Test plan (Vitest, in `rulesEngine.test.ts`)

- `resolveShift` — 8 cases: latest-wins, weekday mask exclude, fall-through to default, no match returns null, effectiveTo open, effectiveTo exclusive boundary, overlapping (latest wins), assignment for different employee ignored.
- `pairPunches` — 6 cases: empty, single, full pair, duplicates collapsed, three+ punches, 30-second-boundary collapse off-by-one.
- `computeDay` — 14 cases: present-on-time, present-late, present-with-OT, present-with-early-leave, missing-checkout, absent-on-scheduled-day, absent-suppressed-on-non-scheduled-day, approved-leave-overrides, holiday-no-punches, holiday-with-punches, overnight-pairing, grace-late, grace-early, no-shift-resolved (status=present, zeros).

## Constitution alignment

- Pure functions: zero coupling to Medical or Accounting (Principle I).
- No DB writes from the rules engine itself; the materializer is the only writer to `attendance_daily` (Principle VI — minimal surface).
