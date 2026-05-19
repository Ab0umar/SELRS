# Phase 1 — Data Model: SRV100 Attendance Module

> All new tables live in the existing MySQL database alongside Medical and Accounting tables. Prefix is **`attendance_`** without exception. No existing table is modified.

## Conventions

- **Times**: `DATETIME` in facility-local time (per `research.md` R7); no time zone columns.
- **Identifiers**: `emp_cd` (employee code) is `VARCHAR(32)`, stable, matches the Tararus source.
- **Surrogate keys**: `BIGINT AUTO_INCREMENT` for high-volume tables (`attendance_punches`, `attendance_sync_runs`); `INT AUTO_INCREMENT` elsewhere.
- **Dedup**: `attendance_punches` has both a `UNIQUE` composite and a `source_hash` (per R8).
- **Rebuildable**: `attendance_daily` is the only computed table; it can be fully regenerated from raw punches + shifts + leaves + holidays.

## Entity-Relationship Overview

```
attendance_employees ─┬─< attendance_shift_assignments >── attendance_shifts
                      ├─< attendance_punches
                      ├─< attendance_leaves
                      └─< attendance_daily

attendance_holidays  (standalone, by date)
attendance_sync_runs (standalone, audit trail)
```

No foreign keys cross into Medical or Accounting tables. `emp_cd` is the only linking key inside this module.

---

## Tables

### `attendance_employees`

Mirror of Tararus employee list, plus locally-managed flags.

| Column | Type | Notes |
|---|---|---|
| `emp_cd` | VARCHAR(32) | **PK**. Stable from source. |
| `full_name` | VARCHAR(255) | NOT NULL. `'UNKNOWN'` for unmapped codes. |
| `department` | VARCHAR(128) | NULL. |
| `default_shift_id` | INT | NULL, FK → `attendance_shifts.id` (ON DELETE SET NULL). |
| `active` | TINYINT(1) | DEFAULT 1. `0` for unknown codes + offboarded staff. |
| `source_hash` | CHAR(40) | NULL. SHA-1 of source row; lets sync detect changes cheaply. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP. |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

Indexes: `idx_active (active)`, `idx_dept (department)`.

---

### `attendance_punches`

Immutable mirror of raw punches.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | **PK**. |
| `emp_cd` | VARCHAR(32) | NOT NULL. **No FK** — punches may arrive for unknown employees (FR-037); orphans are tolerated. |
| `punch_at` | DATETIME | NOT NULL. Facility-local. |
| `direction` | ENUM('in','out','unknown') | DEFAULT 'unknown'. Hint only (see R4). |
| `device_id` | VARCHAR(64) | NULL. Reserved for Phase 3. |
| `source` | ENUM('access','tcp','manual') | NOT NULL. |
| `source_row_id` | VARCHAR(64) | NULL for `manual`; required for `access`/`tcp`. |
| `source_hash` | CHAR(40) | NOT NULL. Dedup key (R8). |
| `note` | VARCHAR(255) | NULL. Used for `source='manual'` corrections. |
| `inserted_by` | INT | NULL. User id for `manual` rows. |
| `imported_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP. |

Indexes:
- `UNIQUE KEY uq_punch (emp_cd, punch_at, source_row_id)`
- `idx_emp_time (emp_cd, punch_at)`
- `idx_punch_at (punch_at)`
- `idx_source (source)`

**Mutation rules**: Insert-only for `source='access'|'tcp'`. `source='manual'` rows are insert-only too — never overwrite raw rows (FR-017).

---

### `attendance_shifts`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | **PK**. |
| `name` | VARCHAR(64) | NOT NULL. |
| `start_time` | TIME | NOT NULL. |
| `end_time` | TIME | NOT NULL. |
| `crosses_midnight` | TINYINT(1) | DEFAULT 0. |
| `grace_late_min` | INT | DEFAULT 0. |
| `grace_early_min` | INT | DEFAULT 0. |
| `break_minutes` | INT | DEFAULT 0. |
| `active` | TINYINT(1) | DEFAULT 1. |
| `created_at`, `updated_at` | DATETIME | as above. |

Indexes: `idx_active (active)`.

---

### `attendance_shift_assignments`

Many-to-many over time. Employee → shift over a date range, with weekday mask.

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | **PK**. |
| `emp_cd` | VARCHAR(32) | NOT NULL. |
| `shift_id` | INT | NOT NULL, FK → `attendance_shifts.id` (ON DELETE RESTRICT). |
| `effective_from` | DATE | NOT NULL. |
| `effective_to` | DATE | NULL (open-ended). |
| `weekday_mask` | TINYINT UNSIGNED | DEFAULT 127 (binary 1111111 = all days). Bit 0 = Sunday. |
| `created_at`, `updated_at` | DATETIME | as above. |

Indexes: `idx_emp_from (emp_cd, effective_from)`.

**Resolution rule**: For employee E on date D, pick the assignment with the latest `effective_from <= D` where `effective_to IS NULL OR effective_to >= D` AND the weekday bit is set. If none matches, fall back to `attendance_employees.default_shift_id`. If still null, the day is treated as "no shift" and lateness/OT are skipped (status still computed).

---

### `attendance_leaves`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | **PK**. |
| `emp_cd` | VARCHAR(32) | NOT NULL. |
| `date_from` | DATE | NOT NULL. |
| `date_to` | DATE | NOT NULL. |
| `type` | ENUM('annual','sick','unpaid','other') | NOT NULL. |
| `approved` | TINYINT(1) | DEFAULT 0. Only `approved=1` overrides `absent`. |
| `note` | VARCHAR(255) | NULL. |
| `created_at`, `updated_at` | DATETIME | as above. |

Indexes: `idx_emp_from (emp_cd, date_from)`.

---

### `attendance_holidays`

| Column | Type | Notes |
|---|---|---|
| `date` | DATE | **PK**. |
| `label` | VARCHAR(128) | NOT NULL. |
| `paid` | TINYINT(1) | DEFAULT 1. |
| `created_at`, `updated_at` | DATETIME | as above. |

---

### `attendance_daily`

Computed table — rebuildable from raw punches + rules.

| Column | Type | Notes |
|---|---|---|
| `emp_cd` | VARCHAR(32) | PK part. |
| `work_date` | DATE | PK part. Shift-anchor date, NOT calendar date of punch (R9). |
| `shift_id` | INT | NULL (no shift resolved). |
| `first_in` | DATETIME | NULL. |
| `last_out` | DATETIME | NULL. |
| `worked_minutes` | INT | NULL when `missing_checkout`. ≥ 0 otherwise. |
| `late_minutes` | INT | DEFAULT 0. |
| `early_leave_min` | INT | DEFAULT 0. |
| `overtime_minutes` | INT | DEFAULT 0. |
| `status` | ENUM('present','absent','leave','holiday','partial','missing_checkout') | NOT NULL. |
| `inside_now` | TINYINT(1) | DEFAULT 0. Materialized for the dashboard "inside now" widget. |
| `computed_at` | DATETIME | NOT NULL. |

**Primary key**: `(emp_cd, work_date)`. Indexes: `idx_date_status (work_date, status)`, `idx_inside_now (inside_now)`.

**Upsert semantics**: `INSERT ... ON DUPLICATE KEY UPDATE ...`. Recompute is idempotent (R11).

---

### `attendance_sync_runs`

Audit trail for every sync attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | **PK**. |
| `started_at` | DATETIME | NOT NULL. |
| `finished_at` | DATETIME | NULL until done. |
| `source` | ENUM('access','tcp') | NOT NULL. |
| `trigger` | ENUM('cron','manual') | NOT NULL. |
| `triggered_by` | INT | NULL for cron, user id for manual. |
| `rows_seen` | INT | DEFAULT 0. |
| `rows_inserted` | INT | DEFAULT 0. |
| `rows_skipped` | INT | DEFAULT 0. Excludes dedup skips. |
| `rows_quarantined` | INT | DEFAULT 0. Future-dated/malformed. |
| `status` | ENUM('running','ok','partial','failed','locked') | NOT NULL. |
| `error` | TEXT | NULL. Sanitized: no env values, no file paths. |
| `high_water_mark` | DATETIME | NULL. Max `punch_at` successfully imported in this run. |

Indexes: `idx_started (started_at DESC)`, `idx_status (status)`.

---

## Retention

At Phase 1 sizing (~730k rows for 2 years), no purge is required.
A future `purgeBefore(date)` admin action is out of scope.

## Migration plan

A single additive Drizzle migration (`drizzle/00XX_add_attendance_tables.sql`) creates all nine tables and indexes in one transaction. No data is moved from any existing table.

## Constitution alignment

- **Principle I**: No FKs to medical/accounting tables. `emp_cd` is opaque to other modules.
- **Principle IV**: All entries are additive — no column rename, no drop, no repurpose.
- **Principle VII**: Medical-side `patients`, `doctors`, etc. are untouched; existing migrations remain frozen.

## Open issues

None. All design decisions traced to spec FRs or `research.md` entries.
