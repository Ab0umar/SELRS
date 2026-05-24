ALTER TABLE `salary_commission_pools`
  ADD COLUMN `section` varchar(32) NOT NULL DEFAULT 'مركز',
  DROP INDEX `uq_pool_year_month`,
  ADD UNIQUE KEY `uq_pool_year_month_section` (`year`, `month`, `section`);
--> statement-breakpoint
ALTER TABLE `salary_payroll`
  ADD COLUMN `section` varchar(32) NOT NULL DEFAULT 'مركز',
  DROP INDEX `uq_payroll_emp_month`,
  ADD UNIQUE KEY `uq_payroll_emp_month_section` (`emp_cd`, `year`, `month`, `section`);
