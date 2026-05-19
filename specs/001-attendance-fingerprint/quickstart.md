# Quickstart — SRV100 Attendance Module (Phase 1)

> How to bring the Attendance module up locally end-to-end: env, migration, sample data, first sync, dashboard, recompute.

## 1. Prerequisites

- The repo already builds (`pnpm install`, `pnpm check` green) on `main`.
- Branch `001-attendance-fingerprint` is checked out.
- MySQL instance is reachable (same one Medical uses).
- A sample Tararus `.mdb` file is available locally. If none exists yet, use the fixture at `server/services/attendance/__tests__/fixtures/tararus-sample.mdb` (added in T-ATT-005).

## 2. Environment variables

Add to `.env.local` (or your equivalent):

```ini
ATTENDANCE_ENABLED=true
ATTENDANCE_SOURCE=access
ATTENDANCE_ACCESS_PATH=D:/path/to/tararus-sample.mdb
ATTENDANCE_ACCESS_COPY_FIRST=true
# Optional tuning — defaults shown:
# ATTENDANCE_SYNC_BIZ_INTERVAL_MS=120000
# ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS=900000
# ATTENDANCE_BIZ_HOURS_START=7
# ATTENDANCE_BIZ_HOURS_END=20
# ATTENDANCE_SAFETY_WINDOW_MIN=120
```

## 3. Apply migrations

```powershell
pnpm db:push
```

This runs `drizzle-kit generate && drizzle-kit migrate`. Verify the new tables:

```sql
SHOW TABLES LIKE 'attendance_%';
-- expect 7 tables (employees, punches, shifts, shift_assignments,
--                  leaves, holidays, daily, sync_runs)  → actually 8 with sync_runs
```

## 4. Permissions

In `AdminPermissions` (existing UI), grant your admin user:
- `attendance.view`
- `attendance.manage`
- `attendance.admin`

Other roles should have **none** of these by default.

## 5. Start the server

```powershell
pnpm dev
```

On boot you should see in the logs:
```
[attendance] scheduler started (biz interval 120000ms, offhours 900000ms)
```
If `ATTENDANCE_ENABLED=false` or `ATTENDANCE_ACCESS_PATH` is missing, the scheduler logs `[attendance] disabled` and the app starts normally (server never blocks on attendance source).

## 6. First sync

Navigate to **/attendance/admin/sync** in the browser. Click **Sync now**.

Expected:
- A new row appears in the sync runs list with `status=ok` (or `partial` if quarantined rows existed).
- `rows_inserted` matches the sample file's row count.
- `high_water_mark` is set to the max `punch_at` in the file.

If `status=locked`: the `.mdb` is open in Tararus or another process. Close it (or set `ATTENDANCE_ACCESS_COPY_FIRST=true`) and retry.

If `status=failed`: check the error in the row's detail; common causes are wrong path or unsupported Access version (try the ODBC fallback per research.md R1).

## 7. First dashboard load

Navigate to **/attendance**.

Expected: six cards render — present today, absent today, late today, inside now, missing checkout (yesterday), last sync status. With a sample file containing today's punches, the counts should match the file.

If counts are zero but punches were inserted: the materializer may not have run. Manually trigger:
```ts
// via dev console or admin tool
attendance.recomputeRange({ from: '2026-05-12', to: '2026-05-19' })
```
or wait for the next sync tick (which auto-recomputes affected dates).

## 8. Browse raw punches

**/attendance/logs** with a date range that covers your sample data should list every imported punch, filterable by employee code.

## 9. Daily attendance

**/attendance/daily?date=YYYY-MM-DD** renders processed rows. Before any shifts/assignments are configured, employees have no resolved shift and lateness/OT are zero. Status will be `present` for days with at least one in/out pair, `missing_checkout` if only one punch, and rows are suppressed for days with no punches if the day isn't a scheduled workday.

## 10. Configure a shift

**/attendance/settings** → Shifts → create:
- Name: "Day"
- Start: 08:00, End: 17:00
- Grace late: 5 min, Grace early: 5 min, Break: 30 min
- Crosses midnight: off

Then create an assignment: employee `E001`, shift `Day`, `effective_from` = today.

Trigger **/attendance/admin/sync** → **Recompute range** for the last 7 days, or wait for the nightly recompute.

## 11. Verify reports

**/attendance/reports/late** with the same date range should list employees with late minutes > 0. Header, column labels, and totals render in Arabic; surrounding UI (filters, buttons) is in English. Browser **Print** produces a print-ready layout.

## 12. Validate Medical and Accounting are unaffected

Open one Medical page and one Accounting page; both behave identically to `main`. Run:

```powershell
pnpm check
```

This is the **mandatory** Phase 1 gate (Constitution Principle VII).

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Scheduler logs `disabled` | `ATTENDANCE_ENABLED=false` or env missing | Set env, restart. |
| `status=locked` on every run | Tararus holds an exclusive lock | Ensure `ATTENDANCE_ACCESS_COPY_FIRST=true`. |
| Unknown employees on dashboard | `emp_cd` not in employee mirror | Go to /attendance/employees → Unknown tab → edit and `active=1`. |
| Late minutes look wrong on overnight shift | Shift `crosses_midnight=false` | Edit shift, set crosses-midnight=true, recompute affected range. |
| Dashboard count differs from raw punches | Materializer is stale | Trigger `recomputeRange` manually or wait for nightly. |

## 14. Removing the module (rollback)

If Phase 1 is rolled back:
1. Set `ATTENDANCE_ENABLED=false` and restart — UI disappears (route guard) and scheduler stops; tables remain.
2. To remove tables, drop migration `00XX_add_attendance_tables.sql` and re-run `pnpm db:push`.

No Medical/Accounting data is touched at any point.
