Follow the project Constitution and Project Principles strictly.
These are gate tasks — run them after each extraction phase completes.

---

## T004 — pnpm check gate after helper extractions

Task: Run `pnpm check` after T002 and T003 (device-helpers and schedule-helpers) are complete.

1. Run `pnpm check`
2. If any errors: read the error, identify which file caused it, and fix the import/export mismatch
3. Confirm `pnpm check` exits 0 before proceeding

Report: exit code, any errors found and fixed.

---

## T006 — pnpm check gate after attendance-sync.ts extraction

Task: Run `pnpm check` after T005 (attendance-sync.ts) is complete. Verify line count reduction.

1. Run `pnpm check`
2. Run `(Get-Content server/routers/attendance.ts).Count` — should be ≤ 3,000
3. Run `(Get-Content server/routers/attendance-sync.ts).Count` — should be ≥ 800
4. Confirm `trpc.attendance.syncNow` is still callable by grep:
   `grep -n "syncNow" server/routers/attendance-sync.ts`

Report: exit code, both file line counts, syncNow found in new file (yes/no).

---

## T008 — pnpm check gate after attendance-shifts.ts extraction

Task: Run `pnpm check` after T007 (attendance-shifts.ts) is complete. Verify line count.

1. Run `pnpm check`
2. Run `(Get-Content server/routers/attendance.ts).Count` — should be ≤ 2,000
3. Run `(Get-Content server/routers/attendance-shifts.ts).Count`
4. Confirm `trpc.attendance.createShift` still exists:
   `grep -n "createShift" server/routers/attendance-shifts.ts`

Report: exit code, both file line counts, createShift found (yes/no).

---

## T010 — pnpm check gate after attendance-leaves.ts extraction

Task: Run `pnpm check` after T009 (attendance-leaves.ts) is complete. Verify line count.

1. Run `pnpm check`
2. Run `(Get-Content server/routers/attendance.ts).Count` — should be ≤ 1,200
3. Run `(Get-Content server/routers/attendance-leaves.ts).Count`
4. Confirm `createLeave` in new file:
   `grep -n "createLeave" server/routers/attendance-leaves.ts`

Report: exit code, both file line counts, createLeave found (yes/no).

---

## T013 — Final verification: pnpm check + pnpm test + line count report

Task: Run the full verification suite after all attendance router splits are complete (T001–T012).

1. Run `pnpm check` — zero errors required
2. Run `pnpm test` — all tests must pass
3. Run line counts for all five files:
   ```
   (Get-Content server/routers/attendance.ts).Count
   (Get-Content server/routers/attendance-sync.ts).Count
   (Get-Content server/routers/attendance-shifts.ts).Count
   (Get-Content server/routers/attendance-leaves.ts).Count
   (Get-Content server/routers/attendance-reports.ts).Count
   ```
4. Confirm no file exceeds 2,500 lines; `attendance.ts` must be ≤ 800 lines
5. Confirm the four spreads exist in `attendance.ts`:
   ```
   grep "attendanceSyncRoutes\|attendanceShiftsRoutes\|attendanceLeavesRoutes\|attendanceReportsRoutes" server/routers/attendance.ts
   ```

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: check exit code, test results (X pass / Y fail), line count table, spread confirmation.
