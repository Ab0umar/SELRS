-- Add Attendance Module Tables (Phase 1)
-- Fully isolated from Medical and Accounting modules

CREATE TABLE IF NOT EXISTS `attendance_employees` (
  `emp_cd` varchar(32) NOT NULL PRIMARY KEY,
  `full_name` varchar(255) NOT NULL,
  `department` varchar(128),
  `default_shift_id` int,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `source_hash` varchar(40),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_active` (`active`),
  KEY `idx_dept` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_punches` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `emp_cd` varchar(32) NOT NULL,
  `punch_at` datetime NOT NULL,
  `direction` enum('in','out','unknown') NOT NULL DEFAULT 'unknown',
  `device_id` varchar(64),
  `source` enum('access','tcp','manual') NOT NULL,
  `source_row_id` varchar(64),
  `source_hash` varchar(40) NOT NULL,
  `note` varchar(255),
  `inserted_by` int,
  `importedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_punch` (`emp_cd`, `punch_at`, `source_row_id`),
  KEY `idx_emp_time` (`emp_cd`, `punch_at`),
  KEY `idx_punch_at` (`punch_at`),
  KEY `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_shifts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(64) NOT NULL,
  `start_time` varchar(8) NOT NULL,
  `end_time` varchar(8) NOT NULL,
  `crosses_midnight` tinyint(1) NOT NULL DEFAULT 0,
  `grace_late_min` int NOT NULL DEFAULT 0,
  `grace_early_min` int NOT NULL DEFAULT 0,
  `break_minutes` int NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_shift_assignments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `emp_cd` varchar(32) NOT NULL,
  `shift_id` int NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date,
  `weekday_mask` int unsigned NOT NULL DEFAULT 127,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_emp_from` (`emp_cd`, `effective_from`),
  CONSTRAINT `fk_shift_assignments_shift` FOREIGN KEY (`shift_id`) REFERENCES `attendance_shifts`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_leaves` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `emp_cd` varchar(32) NOT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `type` enum('annual','sick','unpaid','other') NOT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT 0,
  `note` varchar(255),
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_emp_from` (`emp_cd`, `date_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_holidays` (
  `date` date NOT NULL PRIMARY KEY,
  `label` varchar(128) NOT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_daily` (
  `emp_cd` varchar(32) NOT NULL,
  `work_date` date NOT NULL,
  `shift_id` int,
  `first_in` datetime,
  `last_out` datetime,
  `worked_minutes` int,
  `late_minutes` int NOT NULL DEFAULT 0,
  `early_leave_min` int NOT NULL DEFAULT 0,
  `overtime_minutes` int NOT NULL DEFAULT 0,
  `status` enum('present','absent','leave','holiday','partial','missing_checkout') NOT NULL,
  `inside_now` tinyint(1) NOT NULL DEFAULT 0,
  `computedAt` datetime NOT NULL,
  PRIMARY KEY (`emp_cd`, `work_date`),
  KEY `idx_date_status` (`work_date`, `status`),
  KEY `idx_inside_now` (`inside_now`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_sync_runs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `started_at` datetime NOT NULL,
  `finished_at` datetime,
  `source` enum('access','tcp') NOT NULL,
  `trigger` enum('cron','manual') NOT NULL,
  `triggered_by` int,
  `rows_seen` int NOT NULL DEFAULT 0,
  `rows_inserted` int NOT NULL DEFAULT 0,
  `rows_skipped` int NOT NULL DEFAULT 0,
  `rows_quarantined` int NOT NULL DEFAULT 0,
  `status` enum('running','ok','partial','failed','locked') NOT NULL,
  `error` text,
  `high_water_mark` datetime,
  KEY `idx_started` (`started_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
