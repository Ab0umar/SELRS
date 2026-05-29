-- Add insurance_deduction to salary_basics (fixed monthly deduction per employee)
ALTER TABLE `salary_basics`
  ADD COLUMN `insurance_deduction` decimal(12,2) NOT NULL DEFAULT '0.00';

-- Add advances and insurance columns to salary_payroll
ALTER TABLE `salary_payroll`
  ADD COLUMN `advances_deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `insurance_deduction` decimal(12,2) NOT NULL DEFAULT '0.00';

-- New table for per-employee per-month advance entries (like salary_penalties)
CREATE TABLE IF NOT EXISTS `salary_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_cd` varchar(32) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(500),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_advance_emp_month` (`emp_cd`, `year`, `month`)
);
