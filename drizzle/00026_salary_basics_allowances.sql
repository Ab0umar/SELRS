ALTER TABLE `salary_basics`
  ADD COLUMN `social_allowance` decimal(12,2) NOT NULL DEFAULT 0 AFTER `basic_amount`,
  ADD COLUMN `cost_of_living_allowance` decimal(12,2) NOT NULL DEFAULT 0 AFTER `social_allowance`,
  ADD COLUMN `transport_allowance` decimal(12,2) NOT NULL DEFAULT 0 AFTER `cost_of_living_allowance`,
  ADD COLUMN `work_nature_allowance` decimal(12,2) NOT NULL DEFAULT 0 AFTER `transport_allowance`,
  ADD COLUMN `reception_allowance` decimal(12,2) NOT NULL DEFAULT 0 AFTER `work_nature_allowance`;
