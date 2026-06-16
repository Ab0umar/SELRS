ALTER TABLE `salary_payroll`
  ADD COLUMN `cost_of_living_allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `transport_allowance` decimal(12,2) NOT NULL DEFAULT '0.00';
