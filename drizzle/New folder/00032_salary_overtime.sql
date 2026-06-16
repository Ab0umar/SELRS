ALTER TABLE `salary_payroll`
  ADD COLUMN `overtime_minutes` int NOT NULL DEFAULT 0,
  ADD COLUMN `overtime_pay` decimal(12,2) NOT NULL DEFAULT '0';
