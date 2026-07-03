ALTER TABLE `salary_payroll` ADD COLUMN `attendance_commission_raw` decimal(12,2) NOT NULL DEFAULT '0';
--> statement-breakpoint
ALTER TABLE `salary_payroll` ADD COLUMN `exam_commission_raw` decimal(12,2) NOT NULL DEFAULT '0';
--> statement-breakpoint
ALTER TABLE `salary_payroll` ADD COLUMN `pentacam_commission_raw` decimal(12,2) NOT NULL DEFAULT '0';
