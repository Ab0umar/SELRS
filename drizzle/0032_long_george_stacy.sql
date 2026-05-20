CREATE TABLE `attendance_daily` (
	`emp_cd` varchar(32) NOT NULL,
	`work_date` date NOT NULL,
	`shift_id` int,
	`first_in` timestamp,
	`last_out` timestamp,
	`worked_minutes` int,
	`late_minutes` int NOT NULL DEFAULT 0,
	`early_leave_min` int NOT NULL DEFAULT 0,
	`overtime_minutes` int NOT NULL DEFAULT 0,
	`status` enum('present','absent','leave','holiday','partial','missing_checkout') NOT NULL,
	`inside_now` boolean NOT NULL DEFAULT false,
	`computedAt` timestamp NOT NULL,
	CONSTRAINT `attendance_daily_emp_cd_work_date_pk` PRIMARY KEY(`emp_cd`,`work_date`)
);
--> statement-breakpoint
CREATE TABLE `attendance_device_settings` (
	`id` int NOT NULL DEFAULT 1,
	`enabled` boolean NOT NULL DEFAULT false,
	`ip` varchar(255) NOT NULL DEFAULT '192.168.1.100',
	`port` int NOT NULL DEFAULT 5005,
	`protocol` enum('tcp','udp') NOT NULL DEFAULT 'tcp',
	`fallback_to_access` boolean NOT NULL DEFAULT true,
	`real_time_sync` boolean NOT NULL DEFAULT true,
	`last_config_update` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_device_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_employees` (
	`emp_cd` varchar(32) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`department` varchar(128),
	`default_shift_id` int,
	`active` boolean NOT NULL DEFAULT true,
	`source_hash` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_employees_emp_cd` PRIMARY KEY(`emp_cd`)
);
--> statement-breakpoint
CREATE TABLE `attendance_holidays` (
	`date` date NOT NULL,
	`label` varchar(128) NOT NULL,
	`paid` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_holidays_date` PRIMARY KEY(`date`)
);
--> statement-breakpoint
CREATE TABLE `attendance_leaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`date_from` date NOT NULL,
	`date_to` date NOT NULL,
	`type` enum('annual','sick','unpaid','other') NOT NULL,
	`approved` boolean NOT NULL DEFAULT false,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_leaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineUserId` varchar(50) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`type` enum('check_in','check_out','unknown') DEFAULT 'check_in',
	`machineName` varchar(100),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `attendance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_punches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`punch_at` timestamp NOT NULL,
	`direction` enum('in','out','unknown') NOT NULL DEFAULT 'unknown',
	`device_id` varchar(64),
	`source` enum('access','tcp','manual') NOT NULL,
	`source_row_id` varchar(64),
	`source_hash` varchar(40) NOT NULL,
	`note` varchar(255),
	`inserted_by` int,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_punches_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_punch` UNIQUE(`emp_cd`,`punch_at`,`source_row_id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_shift_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`shift_id` int NOT NULL,
	`effective_from` date NOT NULL,
	`effective_to` date,
	`weekday_mask` int NOT NULL DEFAULT 127,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_shift_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`start_time` varchar(8) NOT NULL,
	`end_time` varchar(8) NOT NULL,
	`crosses_midnight` boolean NOT NULL DEFAULT false,
	`grace_late_min` int NOT NULL DEFAULT 0,
	`grace_early_min` int NOT NULL DEFAULT 0,
	`break_minutes` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp,
	`source` enum('access','tcp') NOT NULL,
	`trigger` enum('cron','manual') NOT NULL,
	`triggered_by` int,
	`rows_seen` int NOT NULL DEFAULT 0,
	`rows_inserted` int NOT NULL DEFAULT 0,
	`rows_skipped` int NOT NULL DEFAULT 0,
	`rows_quarantined` int NOT NULL DEFAULT 0,
	`status` enum('running','ok','partial','failed','locked') NOT NULL,
	`error` text,
	`high_water_mark` timestamp,
	CONSTRAINT `attendance_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_attendance_mapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`machineUserId` varchar(50) NOT NULL,
	`shiftId` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `employee_attendance_mapping_id` PRIMARY KEY(`id`),
	CONSTRAINT `employee_attendance_mapping_machineUserId_unique` UNIQUE(`machineUserId`)
);
--> statement-breakpoint
CREATE INDEX `idx_date_status` ON `attendance_daily` (`work_date`,`status`);--> statement-breakpoint
CREATE INDEX `idx_inside_now` ON `attendance_daily` (`inside_now`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `attendance_employees` (`active`);--> statement-breakpoint
CREATE INDEX `idx_dept` ON `attendance_employees` (`department`);--> statement-breakpoint
CREATE INDEX `idx_emp_from` ON `attendance_leaves` (`emp_cd`,`date_from`);--> statement-breakpoint
CREATE INDEX `idx_emp_time` ON `attendance_punches` (`emp_cd`,`punch_at`);--> statement-breakpoint
CREATE INDEX `idx_punch_at` ON `attendance_punches` (`punch_at`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `attendance_punches` (`source`);--> statement-breakpoint
CREATE INDEX `idx_emp_from` ON `attendance_shift_assignments` (`emp_cd`,`effective_from`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `attendance_shifts` (`active`);--> statement-breakpoint
CREATE INDEX `idx_started` ON `attendance_sync_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `attendance_sync_runs` (`status`);