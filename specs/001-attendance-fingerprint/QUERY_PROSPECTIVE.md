# Attendance Module: Query & Report Prospective

**Based on:** Taraus original schema + Lasik26 query patterns

---

## Data Source (Taraus Original)

### Tables
- `KQ_KQData` (4590 rows) - Raw punch records: EmpNo, KQDateTime, IsSignIn, IsInvalid, MacSN, VerifyModeName, InOutModeName
- `RS_Emp` (15 rows) - Employees: EmpNo, EmpName, DepartID, IsDimission, RuleID
- `KQ_Shift` (27 rows) - Shift definitions: ShiftID, ShiftName, WorkHours, SigninTime1-5, Signout1-5
- `KQ_EmpShift` (96901 rows) - Employee shift assignments: EmpNo, EmpShiftDate, ShiftNo

---

## Phase 3: Dashboard (COMPLETE)
- ✅ dashboardSummary query (backend service)
- ✅ syncStatus query (backend service)

---

## Phase 4: Daily Report & Logs

### Daily Data Processing Queries

**D1: Q_Raw_Punches** (SELECT)
- Source: `KQ_KQData`
- Purpose: Extract valid punches since HWM, exclude quarantined rows
- Columns: EmpNo, KQDateTime, IsSignIn, MacSN
- Filter: KQDateTime >= HWM, IsInvalid = 0
- Output: Feed to daily calculation

**D2: Q_Daily_Base** (SELECT)
- Source: KQ_KQData (from since HWM), KQ_EmpShift, KQ_Shift
- Purpose: Pair punches per day per employee, match to shift
- Columns: EmpNo, KQDate, ShiftID, TimeIn1, TimeOut1, TimeIn2, TimeOut2, ...TimeIn5/Out5
- Logic: Group punches by date, pair in/out, align to shift times
- Output: Base daily without calculations

**D3: Q_Daily_WithDayName** (SELECT)
- Source: Q_Daily_Base
- Purpose: Add day-of-week, work/weekend flags
- Columns: EmpNo, KQDate, DayOfWeek, IsWorkDay, IsWeekend, IsHoliday (from KQ_Holiday)

**D4: Q_Daily_WithPermission** (SELECT)
- Source: Q_Daily_WithDayName, KQ_EmpPermission
- Purpose: Apply permission/leave reductions to lateness
- Columns: EmpNo, KQDate, LateMins (original), PermissionMins, FinalLateMins
- Logic: `FinalLateMins = MAX(0, LateMins - PermissionMins)`
- Output: Late mins adjusted for permissions

**D5: Q_Daily_Final** (SELECT)
- Source: Q_Daily_WithPermission
- Purpose: Compute final daily metrics
- Columns: EmpNo, KQDate, WorkDays, AbsentDays, LateMins (final), LeaveMins, OverTimeMins, InsideNow
- Logic: Apply rules engine (computeDay) here or in app
- Output: attendance_daily rows ready to UPSERT

### Daily Report Views

**RD1: Raw_Logs_View** (SELECT)
- Source: KQ_KQData + RS_Emp
- Purpose: Frontend raw logs page with filters
- Columns: EmpNo, EmpName, KQDateTime, IsSignIn, InOutModeName, MacSN, IsInvalid
- Filters: DateRange, EmpNo, Direction

**RD2: Daily_Attendance_View** (SELECT)
- Source: attendance_daily (after upsert) + RS_Emp
- Purpose: Frontend daily page - show processed daily records
- Columns: EmpNo, EmpName, KQDate, WorkDays, AbsentDays, LateMins, LeaveMins, Status (present/absent/late)

---

## Phase 5: Monthly Reports & Aggregations

### Monthly Calculation Queries

**M1: Q_Build_Monthly** (SELECT)
- Source: attendance_daily (for a date range or YearMonth)
- Purpose: Aggregate daily to monthly metrics
- Columns: EmpNo, YYYY-MM, MonthDays, WorkDays, AbsentDays, SumLateMins, SumLeaveMins, SumOTMins
- Logic: GROUP BY EmpNo, YearMonth; SUM/COUNT daily metrics
- Output: Raw monthly aggregates

**M2: Q_MonthlyWithBalance** (SELECT)
- Source: Q_Build_Monthly, KQ_DayOffBalance
- Purpose: Add leave balance info to monthly report
- Columns: EmpNo, YYYY-MM, MonthDays, WorkDays, ..., DayOffUsed, DayOffRemain, DayOffBalance

**M3: Q_Monthly_Final** (SELECT)
- Source: Q_MonthlyWithBalance
- Purpose: Final monthly report with all metrics
- Columns: EmpNo, EmpName, DepartID, YYYY-MM, MonthDays, WorkDays, AbsentDays, LateMins, LateCount, LeaveMins, LeaveCount, OTMins, DayOffUsed, DayOffRemain, Notes
- Output: attendance_monthly_report

### Monthly Report Views

**RM1: Monthly_Report_View** (SELECT)
- Source: attendance_monthly_report + RS_Emp
- Purpose: Frontend monthly reports page
- Columns: EmpNo, EmpName, DepartID, YearMonth, WorkDays, LateMins, LeaveUsed, OTMins, Status
- Filters: DateRange, EmpNo, Department

**RM2: Late_Report_View** (SELECT)
- Source: attendance_daily, RS_Emp
- Purpose: Employees who were late in a period
- Columns: EmpNo, EmpName, Count(Late>0), SUM(LateMins)
- Filter: DateRange, LateMins > 0
- Order: SUM(LateMins) DESC

**RM3: Absent_Report_View** (SELECT)
- Source: attendance_daily, RS_Emp
- Purpose: Absence summary
- Columns: EmpNo, EmpName, Count(Absent), SUM(AbsentDays)
- Filter: DateRange, AbsentDays > 0

**RM4: OT_Report_View** (SELECT)
- Source: attendance_daily, RS_Emp
- Purpose: Overtime summary
- Columns: EmpNo, EmpName, SUM(OTMins), Count(OT>0)
- Filter: DateRange, OTMins > 0

---

## Phase 6: Leave & Day-off Management

### Leave Queries

**L1: Q_LeavePerMonth** (SELECT)
- Source: KQ_EmpLeave (table to create), attendance_daily
- Purpose: Calculate leave usage per employee per month
- Columns: EmpNo, YYYY-MM, TotalLeaveDays, UsedDays, RemainingDays

**L2: Q_DayOff_Summary** (SELECT)
- Source: KQ_EmpDayOff (sick, out, no-show), attendance_daily
- Purpose: Summary of different day-off types
- Columns: EmpNo, SickDays, OutDays, NoDays, TotalDays

**L3: Q_DayOff_Filtered** (SELECT)
- Source: KQ_EmpDayOff
- Purpose: Filter day-offs by type, date range
- Columns: EmpNo, EmpName, DayOffType, DateRange, Count

---

## Phase 7: Permission & Adjustments

### Permission Queries

**P1: Q_PermissionCalc** (SELECT)
- Source: KQ_EmpPermission (to create)
- Purpose: Calculate permission impact on late mins
- Columns: EmpNo, PermissionDate, PermissionMins, AppliedLateMins
- Logic: Map permission hours to late minute reduction

**P2: Q_Permission_Mins** (SELECT)
- Source: Q_PermissionCalc, attendance_daily
- Purpose: Detailed permission vs actual lateness
- Columns: EmpNo, KQDate, LateMins, PermissionMins, AdjustedLateMins

---

## Data Refresh/ETL Cycle (Append & Delete Queries)

### Import Cycle

**E1: Data_Import_Cycle** (Flow)
1. `Q_Raw_Punches` → INSERT IGNORE into `attendance_punches`
2. `Q_Daily_Final` → UPSERT into `attendance_daily`
3. `Q_Build_Monthly` → INSERT/REPLACE into `attendance_monthly_report`

### Cleanup Cycle (Run before refresh)

**E2: Delete_Attendance_Daily** (DELETE)
- Purpose: Clear daily report before rebuild
- SQL: `DELETE FROM attendance_daily WHERE KQDate BETWEEN @dateFrom AND @dateTo`

**E3: Delete_Monthly_Report** (DELETE)
- Purpose: Clear monthly report before rebuild
- SQL: `DELETE FROM attendance_monthly_report WHERE YearMonth = @yearMonth`

---

## Summary: Query Naming Pattern

| Pattern | Purpose | Count (Est.) |
|---------|---------|------|
| `Q_*` | Core calculation queries (daily/monthly) | ~12-15 |
| `qry_*` | Report/list queries | ~8-10 |
| `*_to_*` | Data append/import | ~8-10 |
| `Delete_*` | Cleanup/refresh | ~5-7 |
| **Total Active** | | **~35-42** |

---

## Implementation Priority

1. **Phase 4** (Daily): Q_Raw_Punches → Q_Daily_Final + RD1, RD2
2. **Phase 5** (Monthly): Q_Build_Monthly → Q_Monthly_Final + RM1-4
3. **Phase 6** (Leave): L1, L2, L3
4. **Phase 7** (Permission): P1, P2
5. **ETL**: Import & delete queries for automated refresh

---

## Database Tables to Create

- `attendance_daily` (daily processed records)
- `attendance_monthly_report` (monthly aggregates)
- `attendance_permission` (permission records)
- `attendance_leave` (leave records)
- `attendance_dayoff` (sick/out/no-show)
- `attendance_holiday` (holiday calendar)

---

## Notes

- All queries should handle missing/null shift assignments gracefully
- Permission calculations must support multiple permission types (sick, personal, official)
- Monthly reports should be rebuildable (idempotent) from daily data
- All timestamps must be ISO 8601 for JSON serialization
- Consider indexing: EmpNo, KQDate, YearMonth for query performance
