# Attendance Router Split — Spec

**Mirrors**: `specs/002-medical-router-split/spec.md`

## Problem

`server/routers/attendance.ts` is 3,864 lines — same problem `medical.ts` had before plan 002. Four distinct domains are interleaved: sync/device, shift management, leave/holiday/permissions, and reports. No developer can navigate it efficiently.

## Goal

Split into focused sub-router files using the same extract-and-spread pattern as plan 002. The `trpc.attendance.*` namespace stays flat — no procedure renames.

## Split Targets

| File | Domain | Approximate Lines |
|---|---|---|
| `attendance-sync.ts` | Sync engine, FK device, ZKTeco device, diagnostics | ~900 |
| `attendance-shifts.ts` | Shifts, assignments, cycles, change requests | ~1,100 |
| `attendance-leaves.ts` | Leaves, permissions, holidays, leave balances | ~500 |
| `attendance-reports.ts` | Monthly/late/absent/OT/summary/range reports | ~300 |
| `attendance.ts` (reduced) | Dashboard, employees, daily, health + router composition | ≤ 800 |

## Success Criteria

- No file in `server/routers/` exceeds 2,500 lines
- `attendance.ts` reduced to ≤ 800 lines
- `pnpm check` passes; all tests pass
- Zero procedure renames; `trpc.attendance.*` namespace unchanged
