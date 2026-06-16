ALTER TABLE `salary_commission_pools`
  ADD COLUMN `cost_of_living_allowance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `cost_of_living_allowance_count` int NOT NULL DEFAULT 0,
  ADD COLUMN `cost_of_living_allowance_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `transport_allowance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  ADD COLUMN `transport_allowance_count` int NOT NULL DEFAULT 0,
  ADD COLUMN `transport_allowance_total` decimal(14,2) NOT NULL DEFAULT '0.00';
