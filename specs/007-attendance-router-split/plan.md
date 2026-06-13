# Attendance Router Split — Plan

**Mirrors**: `specs/002-medical-router-split/plan.md`

## Approach

Same extract-and-spread pattern used for `medical.ts` in plan 002:
1. Extract shared helpers into `server/routers/_attendance/`
2. Create sub-router files exporting plain objects (`attendanceSyncRoutes = { ... }`)
3. Spread them into `attendanceRouter` in `attendance.ts`
4. Verify `pnpm check` after every phase

## File Map

| New File | Exported Object | Procedures (approx) |
|---|---|---|
| `_attendance/device-helpers.ts` | helpers only | ZKTeco/FK builder utils |
| `_attendance/schedule-helpers.ts` | helpers only | shift-cycle / mask utils |
| `attendance-sync.ts` | `attendanceSyncRoutes` | ~21 sync + device procedures |
| `attendance-shifts.ts` | `attendanceShiftsRoutes` | ~26 shift + cycle + change procedures |
| `attendance-leaves.ts` | `attendanceLeavesRoutes` | ~17 leave + permission + holiday procedures |
| `attendance-reports.ts` | `attendanceReportsRoutes` | ~7 report procedures |
| `attendance.ts` (reduced) | `attendanceRouter` | ~15 dashboard/daily/employee + all spreads |

## Key Rules

- Sub-routers export **plain objects**, NOT `router()` instances
- `trpc.attendance.*` namespace must remain identical after the split
- AuditLogService calls in mutations must not be removed
- `pnpm check` after every phase — Constitution Principle VII gate

## Constitution Check

- **VI**: Spec-driven execution ✓
- **VII**: `pnpm check` + tests required at every checkpoint ✓
- No cross-module imports introduced; no procedure renames
