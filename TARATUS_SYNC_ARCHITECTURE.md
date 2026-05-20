# Taratus Original Architecture - SRV100 Sync Plan

Extracted from Lasik26.accdb (45 Original Views)

## Critical Tables for SRV100 Attendance Sync

### Raw Data Sources (KQ_* tables → VKQ_* views)

| Source Table | View | Purpose | SRV100 Target |
|---|---|---|---|
| KQ_KQData1 | VKQ_KQData | Raw punch records from fingerprint device | `attendance_punches` |
| RS_Emp | VRS_Emp* | Employee master data | `attendance_employees` |
| KQ_Shift | VKQ_Shift | Shift definitions | `attendance_shifts` |
| KQ_Rule | VKQ_Rule | Attendance rules (late grace, rounding, etc) | `attendance_rules` |
| KQ_Holiday | VKQ_Holiday | Holiday calendar | `attendance_holidays` |
| KQ_EmpPermission | VKQ_EmpPermission | Permission deductions (reduces late/leave mins) | `attendance_permissions` |
| KQ_EmpDayOff | VKQ_EmpDayOff | Leave, sick, day-off records | `attendance_day_offs` |

### Computed/Materialized Tables (rebuilt by Taratus)

| Taratus Table | View | Contents | SRV100 Target |
|---|---|---|---|
| KQ_KQReportDay | VKQ_KQReportDay | Daily attendance (computed from punches) | `attendance_daily` |
| KQ_KQReportMonth | VKQ_KQReportMonth | Monthly aggregations | `attendance_monthly_report` |
| KQ_EmpDayOffBalance | VKQ_EmpDayOffBalance | Running leave balance | `attendance_leave_balance` |
| KQ_EmpOtSure | VKQ_EmpOtSure | Overtime records | `attendance_overtime` |

---

## VKQ_* Views Summary (45 Total)

### Attendance Core (5)
- **VKQ_KQData** - Raw punches + emp details
- **VKQ_KQReportDay** - Daily records + emp details (SOURCE: KQ_KQReportDay table)
- **VKQ_KQReportMonth** - Monthly records + emp details (SOURCE: KQ_KQReportMonth table)
- **VKQ_KQReportTotal** - Combined day+month view
- **VKQ_KQReportTotal2** - Procedure (insert into VKQ_KQReportMonth)

### Data Filter/Mark (2)
- **VKQ_KQDataFilter** - Filtered/corrected punch records
- **VKQ_KQDataFilterMark** - Marked punch corrections by date

### Employee Leave & Overtime (8)
- **VKQ_EmpDayOff** - Active day-offs/leaves
- **VKQ_EmpDayOffA** - Day-off details with balance
- **VKQ_EmpDayOffB** - Day-off with balance
- **VKQ_EmpDayOffBalance** - Leave balance aggregation
- **VKQ_EmpOtSure** - Overtime confirmation records
- **VKQ_EmpOtSureA** - OT with emp details
- **VKQ_EmpOtSureB** - OT with rule calc details
- **VKQ_EmpPermission** - Permission hours deduction (form: Main!txtStartDate to txtEndDate)

### Rules & Configuration (8)
- **VKQ_Rule** - Attendance rules (grace period, rounding, etc)
- **VKQ_RuleCalc** - Rule calculation details
- **VKQ_RuleDepart** - Department-level rules
- **VKQ_RuleEmp** - Employee-level rule overrides
- **VKQ_RuleEmpA** - Employee rule details
- **VKQ_Shift** - Shift definitions
- **VKQ_ShiftRule** - Shift-specific rules
- **VKQ_Holiday** - Holiday/special days calendar

### Employee Master (6)
- **VRS_Emp** - Complete employee view (includes rule, GZ rule, SELRS flag)
- **VRS_EmpA** - Employee with rule name
- **VRS_EmpB** - Base employee view (RuleID, GZRuleID, fingerprint counts, etc)
- **VRS_EmpDimission** - Separated/dismissed employees
- **VRS_EmpFingerInfo** - Fingerprint enrollment status per employee
- **vqT_Monthly** - Procedure (into T_Monthly table)

### Payroll Module (13) - NOT NEEDED FOR ATTENDANCE
- VGZ_* views (Payroll items, rules, reports)

### Device Module (3) - NOT NEEDED FOR ATTENDANCE
- VDI_* views (Device info, pass times)

### Operator/System (3)
- **VSY_Oprt** - System operators
- **VKQ_MJData** - Device machine job data
- vqT_Monthly - Monthly temp table procedure

---

## Key Taratus Calculations

### Daily Record (KQ_KQReportDay columns)
```
EmpNo, KQDate, ShiftID, TimeIn1-5, TimeOut1-5
WorkDays, AbsentDays, OutHrs, LeaveDays
WorkHrs, OtHrs, LateMins, LeaveMins
Remark, MonthDays
```

### Monthly Aggregation (KQ_KQReportMonth columns)
```
EmpNo, KQYM (Year-Month), MonthDays
WorkDays, AbsentDays, WorkHrs, OtHrs
LateMins, LeaveDays, LeaveMins
LeaveCount, LateCount
StartDate, EndDate
```

### Permission Deduction (VKQ_EmpPermission)
```
EmpNo → SUM(DurationHrs) WHERE PermissionDate BETWEEN txtStartDate AND txtEndDate
```
Used to subtract from LateMins and LeaveMins in daily calculations.

---

## Data Flow in Taratus

```
KQ_KQData1 (raw punches)
    ↓ [Device sync/import]
KQ_KQReportDay (daily calc table)
    ↓ [Aggregation procedure]
KQ_KQReportMonth (monthly agg table)
    ↓ [Add emp details]
VKQ_KQReportDay, VKQ_KQReportMonth (views for UI)
    ↓ [Deduct permissions]
Final Reports (LateMins - PermissionMins, etc)
```

---

## For SRV100 Implementation

**Phase 1 (Manual Sync from Access):**
1. Sync KQ_KQData1 → attendance_punches (incremental, dedup by empCd+punchAt+sourceRowId)
2. Sync RS_Emp → attendance_employees
3. Sync KQ_Shift → attendance_shifts
4. Compute daily records (materialize via rulesEngine.computeDay())
5. Compute monthly records (aggregate daily)

**Phase 2+ (Optional):**
- Sync KQ_Rule for grace/rounding rules per employee
- Sync KQ_Holiday for holiday calendar
- Sync KQ_EmpPermission for permission deductions
- Sync KQ_EmpDayOff for leave/day-off tracking
- Implement VKQ_EmpDayOffBalance for leave balance reporting

---

## Critical Notes

1. **VKQ_EmpPermission** has date range filters: `BETWEEN Forms!Main!txtStartDate AND Forms!Main!txtEndDate`
   - In SRV100, use dynamic date range or sync all permissions

2. **LateMins calculation** = (FinalLateMins) - (PermissionMins)
   - Permission deduction is critical

3. **AbsentFlag logic** = (no TimeIn + no TimeOut + not Friday + not single punch)

4. **Weekday numbering**: 1=Sunday, 2=Monday, ..., 6=Friday, 7=Saturday
   - Fridays are often excluded from absent calculation

5. **MonthDays** = COUNT of all days in range (includes holidays/weekends)
   - **WorkDays** = COUNT of days with punches
   - **AbsentDays** = MonthDays - WorkDays - SinglePunchDays

6. **Leave/Permission distinction:**
   - KQ_EmpDayOff = planned/request leaves
   - KQ_EmpPermission = out-of-office hours (deducted from late/early leave)

7. **Single punch days** = Only In OR Out, not both
   - Counted separately from absent

---

## Export Available

All 45 view definitions saved in: `TARATUS_ORIGINAL_VIEWS.md`
