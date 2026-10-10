ALTER TABLE `attendance_leaves`
  MODIFY COLUMN `type` enum('annual','sick','salary','unpaid','other') NOT NULL;

--> statement-breakpoint

ALTER TABLE `salary_payroll`
  ADD COLUMN `leave_deduction` decimal(12,2) NOT NULL DEFAULT '0.00' AFTER `absent_deduction`;
