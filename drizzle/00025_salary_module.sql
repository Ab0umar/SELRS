CREATE TABLE IF NOT EXISTS `salary_basics` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `basic_amount` decimal(12,2) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date,
  `notes` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_salary_emp` (`emp_cd`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `salary_penalties` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(500),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_penalty_emp_month` (`emp_cd`, `year`, `month`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `salary_commission_pools` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `exam_pool` decimal(14,2) NOT NULL DEFAULT 0,
  `pentacam_pool` decimal(14,2) NOT NULL DEFAULT 0,
  `notes` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uq_pool_year_month` (`year`, `month`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `salary_payroll` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL,
  `working_days` int NOT NULL DEFAULT 0,
  `absent_days` int NOT NULL DEFAULT 0,
  `late_minutes` int NOT NULL DEFAULT 0,
  `leave_days` int NOT NULL DEFAULT 0,
  `absent_deduction` decimal(12,2) NOT NULL DEFAULT 0,
  `late_deduction` decimal(12,2) NOT NULL DEFAULT 0,
  `penalty_deduction` decimal(12,2) NOT NULL DEFAULT 0,
  `total_deductions` decimal(12,2) NOT NULL DEFAULT 0,
  `deduction_pct` decimal(6,4) NOT NULL DEFAULT 0,
  `leave_multiplier` decimal(4,2) NOT NULL DEFAULT 1,
  `net_basic` decimal(12,2) NOT NULL,
  `attendance_commission` decimal(12,2) NOT NULL DEFAULT 0,
  `exam_commission` decimal(12,2) NOT NULL DEFAULT 0,
  `pentacam_commission` decimal(12,2) NOT NULL DEFAULT 0,
  `total_commission` decimal(12,2) NOT NULL DEFAULT 0,
  `total_pay` decimal(12,2) NOT NULL,
  `payroll_status` enum('draft','final') NOT NULL DEFAULT 'draft',
  `computed_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uq_payroll_emp_month` (`emp_cd`, `year`, `month`),
  INDEX `idx_payroll_year_month` (`year`, `month`)
);
