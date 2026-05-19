# Attendance Module: Queries & Reports Design

**Combines:** Original Taraus schema + Lasik26 patterns + SRV100 requirements

---

## Overview

Build a **modern attendance system** on top of Taraus read-only Access DB:
- Sync Taraus data to MySQL incrementally
- Compute daily/monthly metrics with permission adjustments
- Expose via REST API (tRPC)
- Support real-time dashboards & reports

---

## Phase 0-2: Data Sync (COMPLETED)

✅ AccessDbAdapter reads KQ_KQData, RS_Emp, KQ_Shift, KQ_EmpShift from Taraus.mdb
✅ SyncEngine imports with HWM, deduplicates, quarantines bad rows
✅ Incremental sync to MySQL attendance_* tables

---

## Phase 3: Dashboard (COMPLETED)

✅ dashboardSummary: COUNT(*) from attendance_daily for today's metrics
✅ syncStatus: List last N sync runs with status

---

## Phase 4: Daily Aggregation & Raw Logs

### Phase 4a: Data Import from Taraus

**Query: Q_Raw_Punches_Validate** (SELECT from KQ_KQData)
```sql
SELECT 
  GUID,
  EmpNo,
  KQDateTime,
  IsSignIn,  -- true=in, false=out
  MacSN,
  VerifyModeName,
  InOutModeID
FROM KQ_KQData
WHERE 
  KQDateTime >= @sinceHWM
  AND IsInvalid = 0  -- Exclude marked invalid
  AND KQDateTime <= DATE_ADD(NOW(), INTERVAL 1 DAY)  -- Reject future >24h
ORDER BY EmpNo, KQDateTime
```

Purpose:
- Filter only valid, recent punches
- Feed to daily aggregation

---

### Phase 4b: Daily Computation

**Query: Q_Daily_Base** (SELECT from attendance_punches + RS_Emp + KQ_EmpShift + KQ_Shift)
```sql
-- Step 1: Pair punches per employee per day
WITH punches_per_day AS (
  SELECT 
    p.EmpNo,
    DATE(p.KQDateTime) as KQDate,
    s.ShiftID,
    s.ShiftName,
    s.SigninTime1, s.SignoutTime1,
    s.SigninTime2, s.SignoutTime2,
    -- ... SigninTime5, SignoutTime5
    SUBSTRING_INDEX(GROUP_CONCAT(
      IF(p.IsSignIn, TIME(p.KQDateTime), NULL) ORDER BY p.KQDateTime
    ), ',', 5) as in_times,  -- First 5 in times
    SUBSTRING_INDEX(GROUP_CONCAT(
      IF(NOT p.IsSignIn, TIME(p.KQDateTime), NULL) ORDER BY p.KQDateTime
    ), ',', 5) as out_times  -- First 5 out times
  FROM attendance_punches p
  LEFT JOIN KQ_EmpShift es ON p.EmpNo = es.EmpNo 
    AND DATE(p.KQDateTime) = DATE(es.EmpShiftDate)
  LEFT JOIN KQ_Shift s ON es.ShiftNo = s.ShiftID
  WHERE DATE(p.KQDateTime) = CURDATE()
  GROUP BY p.EmpNo, DATE(p.KQDateTime), s.ShiftID
),
-- Step 2: Extract individual in/out times
daily_with_times AS (
  SELECT
    EmpNo, KQDate, ShiftID, ShiftName,
    SUBSTRING_INDEX(in_times, ',', 1) as TimeIn1,
    SUBSTRING_INDEX(out_times, ',', 1) as TimeOut1,
    -- ... parse TimeIn2/Out2 through TimeIn5/Out5
    ...
  FROM punches_per_day
)
SELECT * FROM daily_with_times
```

Purpose:
- Parse raw punches into paired in/out times
- Match to shift definitions
- Create base daily record structure

**Query: Q_Daily_WithShiftRules** (SELECT from Q_Daily_Base + KQ_Shift + KQ_Rule)
```sql
SELECT
  d.EmpNo,
  d.KQDate,
  d.ShiftID,
  d.TimeIn1, d.TimeOut1,
  -- Calculate work hours from shift times
  CASE 
    WHEN d.TimeIn1 IS NOT NULL AND d.TimeOut1 IS NOT NULL
    THEN TIMESTAMPDIFF(MINUTE, d.TimeIn1, d.TimeOut1) / 60.0
    ELSE 0
  END as WorkHours,
  -- Calculate late minutes
  CASE 
    WHEN d.TimeIn1 > s.SigninTime1
    THEN TIMESTAMPDIFF(MINUTE, s.SigninTime1, d.TimeIn1)
    ELSE 0
  END as LateMins,
  -- Flag absent (no punch) vs present
  CASE 
    WHEN d.TimeIn1 IS NULL THEN 1 ELSE 0
  END as AbsentDays
FROM Q_Daily_Base d
LEFT JOIN KQ_Shift s ON d.ShiftID = s.ShiftID
LEFT JOIN KQ_Rule r ON ??? -- Rule application
```

Purpose:
- Calculate work hours, lateness, absence based on shift times
- Apply rules (grace periods, overnight shifts, etc.)

**Query: Q_Daily_WithPermission** (SELECT from Q_Daily_WithShiftRules + KQ_EmpPermission)
```sql
SELECT
  d.EmpNo,
  d.KQDate,
  d.LateMins as OriginalLateMins,
  COALESCE(p.PermissionMins, 0) as PermissionMins,
  GREATEST(0, d.LateMins - COALESCE(p.PermissionMins, 0)) as FinalLateMins
FROM Q_Daily_WithShiftRules d
LEFT JOIN Q_PermissionCalc p 
  ON d.EmpNo = p.EmpNo 
  AND d.KQDate = p.PermissionDate
```

Purpose:
- Reduce lateness by approved permissions/absences
- Pattern: `FinalLateMins = MAX(0, LateMins - PermissionMins)`

**Query: Q_Daily_Final** (SELECT from Q_Daily_WithPermission)
```sql
SELECT
  EmpNo,
  KQDate,
  ShiftID,
  TimeIn1, TimeOut1, TimeIn2, TimeOut2, TimeIn3, TimeOut3, TimeIn4, TimeOut4, TimeIn5, TimeOut5,
  WorkHours,
  CASE WHEN WorkHours >= StandardHours THEN 1 ELSE 0 END as WorkDays,
  AbsentDays,
  FinalLateMins as LateMins,
  LeaveMins,
  CASE WHEN WorkHours > StandardHours THEN WorkHours - StandardHours ELSE 0 END as OvertimeMins,
  CASE WHEN ??? THEN 1 ELSE 0 END as InsideNow,
  NOW() as LastUpdated
```

Purpose:
- Final daily metrics ready to UPSERT into attendance_daily
- Used by rules engine (computeDay) in app

---

### Phase 4c: Raw Logs API

**Query: QryGetRawLogs** (SELECT from attendance_punches + RS_Emp)
```sql
SELECT
  p.GUID,
  p.EmpNo,
  e.EmpName,
  p.KQDateTime,
  CASE WHEN p.IsSignIn THEN 'IN' ELSE 'OUT' END as Direction,
  p.VerifyModeName,
  p.MacSN,
  p.Remark,
  p.IsInvalid
FROM attendance_punches p
LEFT JOIN RS_Emp e ON p.EmpNo = e.EmpNo
WHERE 
  (@dateFrom IS NULL OR DATE(p.KQDateTime) >= @dateFrom)
  AND (@dateTo IS NULL OR DATE(p.KQDateTime) <= @dateTo)
  AND (@empNo IS NULL OR p.EmpNo = @empNo)
  AND (@direction IS NULL OR (p.IsSignIn = @direction))
ORDER BY p.KQDateTime DESC
LIMIT @limit
```

Purpose:
- Filter raw punches by date range, employee, direction
- Frontend: /attendance/logs

---

## Phase 5: Monthly Aggregation & Reports

**Query: Q_Build_Monthly** (SELECT from attendance_daily grouped by YearMonth)
```sql
SELECT
  EmpNo,
  CONCAT(YEAR(KQDate), '-', LPAD(MONTH(KQDate), 2, '0')) as YYYYMM,
  MIN(KQDate) as MonthStart,
  MAX(KQDate) as MonthEnd,
  COUNT(*) as MonthDays,
  COALESCE(SUM(CASE WHEN WorkDays > 0 THEN 1 ELSE 0 END), 0) as WorkDays,
  COALESCE(SUM(AbsentDays), 0) as AbsentDays,
  COALESCE(SUM(LateMins), 0) as TotalLateMins,
  COALESCE(COUNT(CASE WHEN LateMins > 0 THEN 1 END), 0) as LateCount,
  COALESCE(SUM(LeaveMins), 0) as TotalLeaveMins,
  COALESCE(COUNT(CASE WHEN LeaveMins > 0 THEN 1 END), 0) as LeaveCount,
  COALESCE(SUM(OvertimeMins), 0) as TotalOTMins,
  NOW() as UpdatedAt
FROM attendance_daily
WHERE YEAR(KQDate) = @year AND MONTH(KQDate) = @month
GROUP BY EmpNo, YYYYMM
```

Purpose:
- Aggregate daily metrics to monthly
- Feed to report generation

**Query: Q_Monthly_Final** (SELECT from Q_Build_Monthly + RS_Emp + attendance_dayoff_balance)
```sql
SELECT
  m.EmpNo,
  e.EmpName,
  e.DepartID,
  m.YYYYMM,
  m.MonthDays,
  m.WorkDays,
  m.AbsentDays,
  m.TotalLateMins,
  m.LateCount,
  m.TotalLeaveMins,
  m.LeaveCount,
  m.TotalOTMins,
  b.DayOffRemain,
  b.DayOffUsed,
  NULL as Notes  -- For manual entry
FROM Q_Build_Monthly m
LEFT JOIN RS_Emp e ON m.EmpNo = e.EmpNo
LEFT JOIN attendance_dayoff_balance b ON m.EmpNo = b.EmpNo
WHERE m.YYYYMM = @yyyymm
ORDER BY e.EmpName
```

Purpose:
- Final monthly report for export/display
- Columns match Taraus KQ_KQReportMonth

---

### Phase 5 Report Views

**QryMonthlyReport** → attendance_monthly_report rows
**QryLateReport** → Employees who were late
```sql
SELECT EmpNo, EmpName, COUNT(*) as LateDays, SUM(LateMins) as TotalLateMins
FROM attendance_daily d
LEFT JOIN RS_Emp e ON d.EmpNo = e.EmpNo
WHERE YYYYMM = @yyyymm AND LateMins > 0
GROUP BY d.EmpNo
ORDER BY TotalLateMins DESC
```

**QryAbsentReport** → Employees who were absent
```sql
SELECT EmpNo, EmpName, COUNT(*) as AbsentDays
FROM attendance_daily d
LEFT JOIN RS_Emp e ON d.EmpNo = e.EmpNo
WHERE YYYYMM = @yyyymm AND AbsentDays > 0
GROUP BY d.EmpNo
ORDER BY AbsentDays DESC
```

**QryOTReport** → Overtime summary
```sql
SELECT EmpNo, EmpName, COUNT(*) as OTDays, SUM(OvertimeMins)/60 as TotalOTHours
FROM attendance_daily d
LEFT JOIN RS_Emp e ON d.EmpNo = e.EmpNo
WHERE YYYYMM = @yyyymm AND OvertimeMins > 0
GROUP BY d.EmpNo
ORDER BY TotalOTHours DESC
```

---

## Phase 6: Leave & Day-off Management

**Query: Q_LeavePerMonth** (Calculate leave usage per month)
```sql
SELECT
  EmpNo,
  CONCAT(YEAR(LeaveDate), '-', LPAD(MONTH(LeaveDate), 2, '0')) as YYYYMM,
  COUNT(*) as LeaveDays,
  SUM(CASE WHEN LeaveType = 'sick' THEN 1 ELSE 0 END) as SickDays,
  SUM(CASE WHEN LeaveType = 'personal' THEN 1 ELSE 0 END) as PersonalDays
FROM attendance_leave
GROUP BY EmpNo, YYYYMM
```

**Query: Q_DayOffBalance** (Current balances per employee)
```sql
SELECT
  EmpNo,
  SUM(CASE WHEN LeaveType = 'annual' THEN AllocationDays ELSE 0 END) - 
  SUM(CASE WHEN LeaveType = 'annual' THEN UsedDays ELSE 0 END) as AnnualRemain,
  SUM(CASE WHEN LeaveType = 'sick' THEN AllocationDays ELSE 0 END) - 
  SUM(CASE WHEN LeaveType = 'sick' THEN UsedDays ELSE 0 END) as SickRemain,
  ...
FROM attendance_leave
WHERE StatusDate = CURDATE()
GROUP BY EmpNo
```

---

## Phase 7: Permission & Adjustments

**Query: Q_PermissionCalc** (Permission impact)
```sql
SELECT
  EmpNo,
  PermissionDate,
  SUM(CASE WHEN PermissionType = 'late' THEN DurationMins ELSE 0 END) as LateMinsPermitted,
  SUM(CASE WHEN PermissionType = 'leave' THEN DurationMins ELSE 0 END) as LeaveMinsPermitted
FROM attendance_permission
WHERE ApprovedBy IS NOT NULL
GROUP BY EmpNo, PermissionDate
```

---

## Data Flow Summary

```
Taraus.mdb
    ↓
[SyncEngine] → Incremental sync with HWM
    ↓
attendance_punches (raw)
    ↓
Q_Raw_Punches_Validate → Q_Daily_Base
    ↓
Q_Daily_WithShiftRules → Q_Daily_WithPermission → Q_Daily_Final
    ↓
attendance_daily (daily metrics) ← UPSERT
    ↓
Q_Build_Monthly → Q_Monthly_Final
    ↓
attendance_monthly_report (monthly metrics)
    ↓
QryMonthlyReport / QryLateReport / QryAbsentReport / QryOTReport
    ↓
Frontend: Dashboard, Raw Logs, Daily View, Monthly Reports, etc.
```

---

## Query Implementation Strategy

### Approach 1: Drizzle ORM Services (Recommended for Phase 4-5)
```typescript
// server/services/attendance/dailyCompute.service.ts
export class DailyComputeService {
  static async computeDay(
    empNo: string, 
    kqDate: Date, 
    punches: RawPunch[], 
    shifts: ShiftRow[], 
    permissions: PermissionRow[]
  ): Promise<DailyRow> {
    // Pair punches
    // Match to shift
    // Calculate late/work/OT
    // Apply permissions
    // Return DailyRow
  }

  static async materializeDaily(dateFrom: Date, dateTo: Date) {
    // Call computeDay for each employee/date
    // UPSERT to attendance_daily
  }
}
```

### Approach 2: SQL Queries (for Reports/Exports)
```typescript
// server/routers/attendance.ts
export const attendanceRouter = router({
  monthlyReport: attendanceViewerProcedure
    .input(z.object({ yyyymm: z.string() }))
    .query(async ({ input }) => {
      // Run Q_Monthly_Final query
      // Return rows
    }),
});
```

---

## Query Count Estimate

| Category | Queries | Status |
|----------|---------|--------|
| Daily computation | Q_Daily_Base through Q_Daily_Final | Phase 4 |
| Daily reports | Raw logs view, daily detail | Phase 4 |
| Monthly aggregation | Q_Build_Monthly, Q_Monthly_Final | Phase 5 |
| Monthly reports | Late, Absent, OT reports | Phase 5 |
| Leave/day-off | Q_LeavePerMonth, Q_DayOffBalance | Phase 6 |
| Permission | Q_PermissionCalc | Phase 7 |
| **Total** | **~20-25 queries** | |

---

## SQL Patterns Used (Adapted from Taraus/Lasik26)

1. **Punch Pairing**: GROUP_CONCAT to pair in/out times
2. **Late Calculation**: Compare punch vs shift time, apply grace period
3. **Permission Reduction**: `MAX(0, LateMins - PermissionMins)`
4. **Monthly Aggregation**: GROUP BY EmpNo, YYYYMM; SUM/COUNT metrics
5. **Balance Tracking**: Running totals with allocation - used
6. **Date Filtering**: WHERE with parameter-based ranges

---

## Notes

- All queries must handle NULL shift assignments (day-off or unscheduled)
- Permission types: late reduction, full-day leave, partial-day leave, sick leave
- Monthly report must be rebuildable from daily data (idempotent)
- Reports should support date range filtering for ad-hoc analysis
- Timezone: Use DATE() for day boundaries (assuming UTC stored in DB)
- Performance: Index on (EmpNo, KQDate) for daily queries, (EmpNo, YYYYMM) for monthly
