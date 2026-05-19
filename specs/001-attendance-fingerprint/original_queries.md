# Original Taraus Schema & Pre-built Queries

**Source:** Taurus.mdb inspection + Lasik26 analysis

---

## Original Data Tables (Read-Only for Phase 1)

### Core Tables
- **KQ_KQData** (4590 rows)
  - Raw punch records from fingerprint device
  - Columns: GUID, EmpNo, EmpName, KQDateTime, KQDate, KQTime, MacSN, IsSignIn, IsInvalid, OprtNo, OprtDate, Remark, VerifyModeID, VerifyModeName, InOutModeID, InOutModeName
  - Primary key: GUID
  - Purpose: Source of truth for all punch events

- **RS_Emp** (15 rows)
  - Employee master data
  - Columns: EmpNo, EmpName, EmpSex, DepartID, EmpHireDate, EmpCertNo, CardNo10, CardNo81, CardNo82, FingerNo, FingerPrivilege, IsAttend, RuleID, EmpAddress, EmpPhoneNo, EmpMemo, EmpPhotoImage, IsDimission, DimissionDate, DimissionReason, DimissionOprt, OprtNo, OprtDate, EmpGZ, GZRuleID, PassWord
  - Primary key: EmpNo
  - Purpose: Employee roster, used to link punch records to employee info

- **KQ_Shift** (27 rows)
  - Shift definitions
  - Columns: ShiftID, ShiftName, WorkHours, OverHours, IsAuto, ShiftAhead1-5, ShiftDefer1-5, SigninTime1-5, SignoutTime1-5, Signin1-5, Signout1-5, SortID1-5, Drift1-5, ShiftCount
  - Primary key: ShiftID
  - Purpose: Define work shifts with time slots

- **KQ_EmpShift** (96901 rows)
  - Employee shift assignments
  - Columns: GUID, EmpNo, EmpShiftDate, ShiftNo
  - Purpose: Map employee to shift for each date

### Supporting Tables (in Taraus, but less used in Phase 1)
- KQ_Holiday - Holiday dates
- KQ_Rule - Rule definitions for calculations
- KQ_DayOff - Day-off types and definitions
- RS_Depart - Department definitions
- SY_Config - System configuration

---

## Pre-Built Report Tables in Taraus/Lasik26

### Monthly Report (Already Computed)
- **KQ_KQReportMonth** (177 rows)
  - Columns: KQYM, EmpNo, UpdateDate, MonthDays, SunDays, HdDays, WorkDays, AbsentDays, WorkHrs, OtHrs, SunHrs, HdHrs, LateMins, LateCount, LeaveMins, LeaveCount, NSCount, MidCount, Hrs10-19
  - Purpose: Pre-aggregated monthly metrics

- **VKQ_KQReportMonth1** (432 rows - View version)
  - Same as KQ_KQReportMonth but includes EmpName, DepartID, DayOffMonth, StartDate, EndDate
  - Purpose: Display version with employee details

### Daily Report (Already Computed)
- **KQ_KQReportDay** (8121 rows)
  - Columns: EmpNo, KQDate, ShiftID, TimeIn1-5, TimeOut1-5, WorkDays, AbsentDays, OutHrs, LeaveDays, WorkHrs, OtHrs, LateMins, LeaveMins, Remark, MonthDays
  - Purpose: Pre-aggregated daily attendance records

### Other Pre-Built Reports
- **KQ_ReportRecords** (86 rows)
  - By-day punch log format: KQYM, EmpNo, EmpName, DepartID, DepartName, CardTime01-31 (one column per calendar day)
  - Purpose: Calendar view of punches

- **KQ_EmpDayOff_Agg** (12 rows)
  - Aggregated day-off balances per employee
  - Columns: EmpNo, TotalLeaveDays, TotalDayOffBalance, TotalDayOffRemain, TotalDayOffUsed, TotalDayOffSick, TotalDayOffOut, TotalDayOffNo

- **KQ_DayOffBalance** (14 rows)
  - Current day-off balance per employee
  - Columns: EmpNo, EmpName, LeaveDays, DayOffBalance, DayOffRemain, DayOffUsed, DayOffSick, DayOffOut, DayOffNo

---

## Original Data Processing Flow (Inferred from Taraus)

1. **Raw Data Collection**
   - Fingerprint device → KQ_KQData (GUID, EmpNo, IsSignIn, KQDateTime)

2. **Employee Matching**
   - KQ_KQData.EmpNo ← RS_Emp.EmpNo (join on employee code)
   - Unknown codes → create placeholder or quarantine

3. **Shift Assignment**
   - KQ_EmpShift (EmpNo, EmpShiftDate) → match to KQ_Shift (ShiftID)

4. **Daily Aggregation** (→ KQ_KQReportDay)
   - Group KQ_KQData by EmpNo + KQDate
   - Pair punches: TimeIn1, TimeOut1, TimeIn2, TimeOut2, etc.
   - Compute: WorkHrs, LateMins, LeaveMins based on shift

5. **Monthly Aggregation** (→ KQ_KQReportMonth)
   - Group KQ_KQReportDay by EmpNo + KQYM
   - Sum: WorkHrs, LateMins, LeaveMins, etc.
   - Count: WorkDays, AbsentDays, LateCount, LeaveCount

6. **Balance Calculation** (→ KQ_DayOffBalance)
   - Track remaining leave/day-off per employee

---

## Key Observations from Original Taraus

### Data Quality Issues Handled
- **Unknown employee codes**: Taraus has graceful handling (doesn't crash)
- **Duplicate punches**: Handled via timestamp + employee + direction uniqueness
- **Future-dated punches**: Taraus appears to reject or quarantine these
- **Missing shift assignment**: Day-off or unscheduled work

### Calculation Approaches
- **Late calculation**: Compare punch time vs shift start time, apply grace period
- **Leave minutes**: Separate from late (different calculation)
- **Overtime**: Hours beyond standard shift
- **Day-off types**: Sick, personal, no-show treated differently

### Report Structure
- **Monthly is primary report** (KQ_KQReportMonth)
- **Daily is supporting detail** (KQ_KQReportDay)
- **By-date format** is used (CardTime01-31) for calendar view
- **Aggregation approach**: Hour buckets (Hrs10-19) for time distribution

---

## Tables NOT Modified in Phase 1

These exist in Taraus but we read-only:
- KQ_Holiday
- KQ_Rule
- KQ_RuleCalc
- KQ_Shift
- KQ_EmpShift
- RS_Emp
- RS_Depart
- SY_Config
- KQ_DayOff
- KQ_EmpPermission (if exists)

---

## SQL Patterns Observed in Taraus Queries

### Punch Pairing Pattern
```sql
-- Group by employee & date, pair in/out times
SELECT EmpNo, KQDate, ShiftID,
       MAX(CASE WHEN @seq=1 AND IsSignIn THEN KQTime END) as TimeIn1,
       MAX(CASE WHEN @seq=1 AND NOT IsSignIn THEN KQTime END) as TimeOut1,
       ...
FROM KQ_KQData
GROUP BY EmpNo, KQDate
```

### Late Calculation Pattern
```sql
-- Late mins = punch time - shift start time (if positive)
SELECT EmpNo, KQDate,
       CASE WHEN TimeIn1 > ShiftStartTime 
            THEN DATEDIFF(MINUTE, ShiftStartTime, TimeIn1)
            ELSE 0
       END as LateMins
```

### Permission Reduction Pattern
```sql
-- Apply permission to reduce lateness
SELECT EmpNo, KQDate, LateMins,
       CASE WHEN LateMins > PermissionMins 
            THEN LateMins - PermissionMins
            ELSE 0
       END as AdjustedLateMins
```

### Monthly Aggregation Pattern
```sql
-- Sum daily to monthly
SELECT EmpNo, YEAR(KQDate)*100 + MONTH(KQDate) as KQYM,
       COUNT(*) as MonthDays,
       SUM(WorkDays) as WorkDays,
       SUM(LateMins) as SumLateMins,
       ...
FROM KQ_KQReportDay
GROUP BY EmpNo, YEAR(KQDate), MONTH(KQDate)
```

---

## Limitations of Original Taraus

1. **All reports are pre-computed** - Not real-time
2. **Single punch pairing** - Limited to 5 shifts per day (TimeIn1-5, TimeOut1-5)
3. **No permission tracking** - Hard to see which permissions were applied
4. **Limited day-off types** - Generic day-off tracking
5. **No API/REST interface** - Access only via database
6. **No audit trail** - Can't track who made corrections
7. **No mobile/web UI** - Desktop/web only

---

## Summary

**Original Taraus provides:**
- ✅ Raw punch data (KQ_KQData)
- ✅ Employee roster (RS_Emp)
- ✅ Shift definitions (KQ_Shift, KQ_EmpShift)
- ✅ Daily & monthly pre-computed reports
- ✅ Balance calculations

**NOT provided (need to build for attendance module):**
- REST API with real-time queries
- Web/mobile UI (dashboard, reports, employees list)
- Modern data structures (JSON, timezone-aware timestamps)
- Permission tracking & adjustments
- Manual sync triggers & background jobs
- Incremental sync from Access (not full dump)
- Direct TCP device integration (future)
