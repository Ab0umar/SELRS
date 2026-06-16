CREATE TABLE `attendance_monthly_report` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emp_cd` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`total_days` int NOT NULL DEFAULT 0,
	`present_days` int NOT NULL DEFAULT 0,
	`absent_days` int NOT NULL DEFAULT 0,
	`leave_days` int NOT NULL DEFAULT 0,
	`holiday_days` int NOT NULL DEFAULT 0,
	`partial_days` int NOT NULL DEFAULT 0,
	`missing_checkout_days` int NOT NULL DEFAULT 0,
	`total_late_mins` int NOT NULL DEFAULT 0,
	`late_count` int NOT NULL DEFAULT 0,
	`total_early_leave_mins` int NOT NULL DEFAULT 0,
	`early_leave_count` int NOT NULL DEFAULT 0,
	`total_ot_mins` int NOT NULL DEFAULT 0,
	`computed_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_monthly_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_year_month` ON `attendance_monthly_report` (`year`,`month`);