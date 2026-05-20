# Attendance Module - Quick Reference

## Navigation

| Page | URL | Purpose | Role |
|------|-----|---------|------|
| Dashboard | `/attendance` | Today's summary + sync status | Admin/Manager |
| Employees List | `/attendance/employees` | Search & view all employees | Admin/Manager |
| Employee Detail | `/attendance/employees/:empCd` | Individual attendance history | Admin/Manager |
| Daily Report | `/attendance/daily` | All employees for a specific date | Admin/Manager |
| Admin Settings | `/attendance/admin/settings` | Bootstrap shifts, trigger sync/compute | Admin/Manager only |

## Common Tasks

### 1. Set Up System (First Time)
```
1. Go to /attendance/admin/settings
2. Click "Bootstrap Shifts"
   → Creates 8AM-5PM default shift
   → Assigns all employees
3. Wait for success message
```

### 2. Import Attendance Data
```
1. Run Taratus.exe outside SRV100 (populates Taurus.mdb)
2. Go to /attendance dashboard
3. Click "Sync Now"
   → Imports employees from Access DB
   → Imports punch logs
   → Deduplicates automatically
4. Wait for "Sync complete: N employees, M punches"
```

### 3. Calculate Attendance
```
1. After sync, click "Materialize Daily"
   → Applies rules engine
   → Computes daily records
   → Auto-generates monthly reports
2. Wait for "Attendance computed for N days"
3. Navigate to dashboard to view results
```

### 4. View Today's Summary
```
Go to /attendance
See:
  • Present today (count)
  • Absent today (count)
  • Late today (count)
  • Inside now (count)
  • Missing checkout (count)
  • Last sync: time and status
```

### 5. Check Employee Attendance
```
1. Go to /attendance/employees
2. Search for employee code or name
3. Click employee name
4. See full attendance history with date range filter
```

### 6. View Day-by-Day Attendance
```
1. Go to /attendance/daily
2. Pick a date
3. See all employees' records for that day:
   - Check in/out times
   - Late minutes
   - Early leave minutes
   - Overtime hours
   - Status (present, absent, late, etc.)
```

## Data Flow

```
Taratus.exe (external)
    ↓ (populates)
Taurus.mdb (Access DB)
    ↓ (manual sync)
"Sync Now" button
    ↓
Import to MySQL (attendance_punches)
    ↓
"Materialize Daily" button
    ↓
attendance_daily (computed metrics)
    ↓
attendance_monthly_report (auto-generated)
    ↓
Dashboard / Reports (read-only views)
```

## Database Tables

| Table | Contains | Used By |
|-------|----------|---------|
| `attendance_punches` | Raw check in/out times | Sync, Materialization |
| `attendance_daily` | Computed daily metrics | Dashboard, Reports, UI |
| `attendance_monthly_report` | Monthly aggregates | Monthly reports |
| `attendance_shifts` | Shift definitions (8AM-5PM) | Rules engine |
| `attendance_shift_assignments` | Employee-to-shift mapping | Rules engine |
| `attendance_employees` | Mirror of active employees | Employee lists |
| `attendance_sync_runs` | Sync history | Status tracking |

## Key Metrics

**Computed per day per employee:**
- **Status**: present | absent | partial | missing_checkout | leave | holiday
- **Late minutes**: Minutes after grace period (5 min default)
- **Early leave minutes**: Minutes before shift end (10 min grace default)
- **Overtime minutes**: Minutes beyond shift duration

**Aggregated per month per employee:**
- Total days, present days, absent days, leave days, holiday days
- Partial days, missing checkout days
- Total late minutes & count
- Total early leave minutes & count
- Total overtime minutes

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Sync Status: locked" | Another sync in progress | Wait 5 seconds, retry |
| No employees after sync | Taratus not run yet | Run Taratus.exe, ensure RS_Emp has data |
| All employees "absent" | No shifts assigned | Click "Bootstrap Shifts" |
| Empty daily view | Daily not materialized | Click "Materialize Daily" |
| File not found error | Wrong Access DB path | Update `E:\Taurus V3.0\Taurus.mdb` in code |
| No change after sync | Need to materialize | Run "Materialize Daily" after each sync |

## Permissions

- **Admin/Manager**: Full access to all pages and actions
- **Doctor/Nurse/Accountant**: No access (no routes visible)
- **Reception**: No access (no routes visible)

Routes are gated by `ProtectedRoute` component (frontend) + backend procedure permissions.

## File Locations

**Backend:**
- Services: `server/services/attendance/`
- Router: `server/routers/attendance.ts`
- Database: `drizzle/schema.ts`, migrations in `drizzle/migrations/`

**Frontend:**
- Pages: `client/src/pages/attendance/`
- Routes: `client/src/App.tsx` (/attendance prefix)

**Config:**
- Access DB path: `server/services/attendance/accessDbReader.service.ts` (line ~10)
- Default shift: `server/routers/attendance.ts` bootstrapShifts procedure

## Modifying Shifts

**To change default shift** (currently 8AM-5PM):
1. Edit `server/routers/attendance.ts`, `bootstrapShifts` procedure
2. Change `startTime`, `endTime`, `graceLateMin`, `graceEarlyMin`
3. Run procedure to recreate shifts

**To add additional shifts:**
1. Use database directly (insert into `attendance_shifts`)
2. Or add API endpoint for shift creation

## Performance Notes

- Sync time: ~1-2 seconds for 100 employees × 5,000 punches
- Daily materialization: ~3-5 seconds for full month
- Monthly report generation: <100ms per employee
- Dashboard queries: <100ms (indexed by date)

## Safety & Backups

- ✅ Access DB is read-only (safe)
- ✅ Sync is idempotent (safe to run multiple times)
- ✅ Daily records are rebuildable (no data loss if deleted)
- ⚠️ MySQL backups recommended (standard practice)
- ⚠️ Manual corrections override not supported (by design — preserve audit trail)

## Future Development

- Direct TCP device integration (Phase 2)
- Automatic scheduled sync
- Holiday/leave request UI
- Report export (PDF/Excel)
- Payroll integration
- Real-time punch detection

---

*For detailed documentation, see SESSION_SUMMARY.md*
