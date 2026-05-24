ALTER TABLE `salary_payroll`
  ADD COLUMN `early_leave_minutes` int NOT NULL DEFAULT 0,
  ADD COLUMN `early_leave_deduction` decimal(12,2) NOT NULL DEFAULT '0';
