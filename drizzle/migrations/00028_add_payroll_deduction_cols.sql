ALTER TABLE `salary_payroll`
  ADD COLUMN `advances_deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `insurance_deduction` decimal(12,2) NOT NULL DEFAULT '0.00';
